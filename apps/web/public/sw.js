// PMS Platform Service Worker
// Provides offline support with multiple caching strategies

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `pms-static-${CACHE_VERSION}`;
const API_CACHE = `pms-api-${CACHE_VERSION}`;
const PAGES_CACHE = `pms-pages-${CACHE_VERSION}`;

const ALL_CACHES = [STATIC_CACHE, API_CACHE, PAGES_CACHE];

// Static assets to pre-cache during installation
const PRECACHE_ASSETS = [
  '/',
  '/favicon.svg',
  '/manifest.json',
];

// API endpoints to cache for offline access
const CACHEABLE_API_PATHS = [
  '/api/v1/goals',
  '/api/v1/analytics',
  '/api/v1/reviews',
  '/api/v1/feedback',
  '/api/v1/users',
];

// Background sync queue for failed mutations
const MUTATION_QUEUE_KEY = 'pms-mutation-queue';

// ─── Helpers ────────────────────────────────────────────────────────────────

function isStaticAsset(url) {
  const path = new URL(url).pathname;
  return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|avif)(\?.*)?$/.test(path);
}

function isAPIRequest(url) {
  const path = new URL(url).pathname;
  return path.startsWith('/api/');
}

function isCacheableAPI(url) {
  const path = new URL(url).pathname;
  return CACHEABLE_API_PATHS.some(
    (apiPath) => path === apiPath || path.startsWith(apiPath + '/')
  );
}

function isHTMLRequest(request) {
  const accept = request.headers.get('Accept') || '';
  return accept.includes('text/html');
}

function isMutationRequest(request) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
}

// ─── Offline Fallback Page ──────────────────────────────────────────────────

const OFFLINE_PAGE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PMS - Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #0f172a;
      color: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
    }
    .container {
      text-align: center;
      max-width: 480px;
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1.5rem;
      opacity: 0.8;
    }
    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
      color: #e2e8f0;
    }
    p {
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }
    button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover { background: #2563eb; }
    .status {
      margin-top: 2rem;
      font-size: 0.875rem;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#x1F4F6;</div>
    <h1>You're Offline</h1>
    <p>
      It looks like you've lost your internet connection.
      Some features may be limited, but your queued changes
      will be synced automatically when you're back online.
    </p>
    <button onclick="window.location.reload()">Try Again</button>
    <div class="status">
      <p>PMS Platform &mdash; Performance Management System</p>
    </div>
  </div>
</body>
</html>
`;

// ─── Install Event ──────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Pre-caching static assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// ─── Activate Event ─────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => !ALL_CACHES.includes(name))
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// ─── Fetch Event ────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests (skip CDN fonts, analytics, etc.)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip file download requests — let them go straight to the network
  if (url.pathname.includes('/download')) {
    return;
  }

  // Handle mutation requests (POST/PUT/PATCH/DELETE) with background sync
  if (isMutationRequest(request)) {
    event.respondWith(handleMutation(request));
    return;
  }

  // Strategy: Cache-first for static assets
  if (isStaticAsset(request.url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Strategy: Network-first for API calls
  if (isAPIRequest(request.url)) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Strategy: Stale-while-revalidate for HTML pages
  if (isHTMLRequest(request)) {
    event.respondWith(staleWhileRevalidate(request, PAGES_CACHE));
    return;
  }

  // Default: network with cache fallback
  event.respondWith(networkFirst(request, STATIC_CACHE));
});

// ─── Caching Strategies ─────────────────────────────────────────────────────

/**
 * Cache-first strategy:
 * Serve from cache if available, otherwise fetch from network and cache it.
 * Best for static assets that rarely change (JS, CSS, images, fonts).
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache-first fetch failed:', error);
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Network-first strategy:
 * Try network first; if it fails, fall back to cached response.
 * Best for API calls where fresh data is preferred but offline access is needed.
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await fetch(request);
    // Cache successful GET responses for cacheable API endpoints
    if (networkResponse.ok && request.method === 'GET' && isCacheableAPI(request.url)) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline fallback for navigation requests
    if (isHTMLRequest(request)) {
      return new Response(OFFLINE_PAGE, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Return a JSON error for API requests
    if (isAPIRequest(request.url)) {
      return new Response(
        JSON.stringify({
          error: 'offline',
          message: 'You are currently offline. This data is not available in cache.',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Stale-while-revalidate strategy:
 * Return cached response immediately while fetching an update in the background.
 * Best for HTML pages where showing something fast is better than waiting.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((error) => {
      console.log('[SW] Stale-while-revalidate fetch failed:', error);
      return null;
    });

  // Return cached version immediately, or wait for network if no cache
  if (cachedResponse) {
    // Trigger background revalidation (don't await)
    fetchPromise;
    return cachedResponse;
  }

  // No cache available, must wait for network
  const networkResponse = await fetchPromise;
  if (networkResponse) {
    return networkResponse;
  }

  // Both cache and network failed - show offline page
  return new Response(OFFLINE_PAGE, {
    headers: { 'Content-Type': 'text/html' },
  });
}

// ─── Background Sync for Mutations ──────────────────────────────────────────

/**
 * Handle mutation requests (POST, PUT, PATCH, DELETE).
 * If the network is available, send normally.
 * If offline, queue the request for replay when back online.
 */
async function handleMutation(request) {
  try {
    const response = await fetch(request.clone());
    return response;
  } catch (error) {
    console.log('[SW] Mutation failed, queuing for background sync:', request.url);

    // Serialize the request for storage
    const body = await request.clone().text();
    const serializedRequest = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: body || null,
      timestamp: Date.now(),
    };

    // Store in IndexedDB-backed queue
    await addToMutationQueue(serializedRequest);

    // Register for background sync if available
    if (self.registration.sync) {
      try {
        await self.registration.sync.register('pms-mutation-sync');
        console.log('[SW] Background sync registered');
      } catch (syncError) {
        console.log('[SW] Background sync registration failed:', syncError);
      }
    }

    return new Response(
      JSON.stringify({
        queued: true,
        message: 'Your changes have been saved locally and will sync when you are back online.',
        timestamp: serializedRequest.timestamp,
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// ─── Mutation Queue (using Cache API as storage) ────────────────────────────

async function addToMutationQueue(serializedRequest) {
  const cache = await caches.open(MUTATION_QUEUE_KEY);
  const queue = await getMutationQueue();
  queue.push(serializedRequest);

  const response = new Response(JSON.stringify(queue), {
    headers: { 'Content-Type': 'application/json' },
  });
  await cache.put(new Request('/_mutation-queue'), response);
}

async function getMutationQueue() {
  try {
    const cache = await caches.open(MUTATION_QUEUE_KEY);
    const response = await cache.match(new Request('/_mutation-queue'));
    if (response) {
      return await response.json();
    }
  } catch (error) {
    console.error('[SW] Failed to read mutation queue:', error);
  }
  return [];
}

async function clearMutationQueue() {
  const cache = await caches.open(MUTATION_QUEUE_KEY);
  await cache.delete(new Request('/_mutation-queue'));
}

async function replayMutationQueue() {
  const queue = await getMutationQueue();

  if (queue.length === 0) {
    console.log('[SW] No queued mutations to replay');
    return;
  }

  console.log(`[SW] Replaying ${queue.length} queued mutation(s)...`);

  const failedRequests = [];

  for (const serializedRequest of queue) {
    try {
      const headers = new Headers(serializedRequest.headers);
      const requestInit = {
        method: serializedRequest.method,
        headers: headers,
      };

      // Only add body for methods that support it
      if (serializedRequest.body && serializedRequest.method !== 'GET' && serializedRequest.method !== 'HEAD') {
        requestInit.body = serializedRequest.body;
      }

      const response = await fetch(serializedRequest.url, requestInit);

      if (response.ok) {
        console.log(`[SW] Successfully replayed: ${serializedRequest.method} ${serializedRequest.url}`);
      } else {
        console.warn(`[SW] Replay returned ${response.status}: ${serializedRequest.method} ${serializedRequest.url}`);
        // Don't re-queue client errors (4xx), only server errors (5xx)
        if (response.status >= 500) {
          failedRequests.push(serializedRequest);
        }
      }
    } catch (error) {
      console.error(`[SW] Replay failed: ${serializedRequest.method} ${serializedRequest.url}`, error);
      failedRequests.push(serializedRequest);
    }
  }

  // Clear the queue and re-add any that failed
  await clearMutationQueue();

  if (failedRequests.length > 0) {
    console.log(`[SW] ${failedRequests.length} mutation(s) still pending`);
    for (const req of failedRequests) {
      await addToMutationQueue(req);
    }
  }

  // Notify all clients about sync completion
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: 'SYNC_COMPLETE',
      replayed: queue.length - failedRequests.length,
      pending: failedRequests.length,
    });
  });
}

// ─── Background Sync Event ──────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'pms-mutation-sync') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(replayMutationQueue());
  }
});

// ─── Online Event Fallback ──────────────────────────────────────────────────
// For browsers that don't support Background Sync, listen for messages
// from the client to trigger replay.

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'REPLAY_MUTATIONS') {
    console.log('[SW] Manual sync replay requested');
    event.waitUntil(replayMutationQueue());
  }

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
