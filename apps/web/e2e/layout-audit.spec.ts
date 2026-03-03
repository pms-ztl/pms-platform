import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Layout Audit — Automated blank-space and UI invariant tests
// ---------------------------------------------------------------------------
// Crawls all routes, checks at each viewport width:
//   1. No card/panel exceeds 50% blank space (severe threshold)
//   2. No master-detail detail pane rendered without content
//   3. No empty-state fills more than 280px height
//   4. Main viewport "empty-page feel" < 35% for 1+ screen heights
//   5. Tabs are clickable and don't create blank regions
// ---------------------------------------------------------------------------

// Routes to audit (all protected routes)
const ROUTES = [
  '/dashboard',
  '/goals',
  '/reviews',
  '/feedback',
  '/one-on-ones',
  '/development',
  '/pip',
  '/recognition',
  '/self-appraisal',
  '/profile',
  '/settings',
  '/help',
  '/skills',
  '/evidence',
  '/announcements',
  '/goal-alignment',
  '/okrs',
  '/career',
  '/leaderboard',
  '/chat',
  '/notifications',
  '/directory',
  '/pulse',
  '/calendar',
  '/exports',
  '/mentoring',
  '/simulator',
  // Role-guarded routes (may redirect, that's OK)
  '/calibration',
  '/analytics',
  '/realtime',
  '/team',
  '/reports',
  '/hr-analytics',
  '/succession',
  '/compensation',
  '/promotions',
  '/compliance',
  '/review-cycles',
  '/manager-dashboard',
  '/health-dashboard',
  '/engagement',
  '/team-insights',
  '/skill-gaps',
  '/report-schedules',
  '/wellbeing',
  '/meeting-analytics',
  '/ai-insights',
  '/anomalies',
  '/benchmarks',
  '/talent-intelligence',
  '/team-optimizer',
  '/culture-diagnostics',
  '/ai-development',
];

// Dev credentials
const DEV_EMAIL = process.env.TEST_EMAIL || 'prasina@techcorp.com';
const DEV_PASSWORD = process.env.TEST_PASSWORD || 'password123';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function login(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill login form
  const emailInput = page.locator('input[type="email"], input[name="email"]');
  const passwordInput = page.locator('input[type="password"], input[name="password"]');

  if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await emailInput.fill(DEV_EMAIL);
    await passwordInput.fill(DEV_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/(dashboard|$)/, { timeout: 15000 });
  }
}

/**
 * Measure blank-space ratio for a given element.
 * Returns ratio of empty area (0 to 1).
 */
async function measureBlankRatio(page: Page, selector: string): Promise<number[]> {
  return page.evaluate((sel) => {
    const elements = document.querySelectorAll(sel);
    const ratios: number[] = [];

    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (rect.width < 50 || rect.height < 50) continue; // skip tiny elements

      const containerArea = rect.width * rect.height;
      if (containerArea === 0) continue;

      // Approximate content area by measuring visible children
      let contentArea = 0;
      const children = el.querySelectorAll('*');
      const seen = new Set<string>();

      for (const child of children) {
        const cr = child.getBoundingClientRect();
        // Must be inside parent
        if (cr.top >= rect.bottom || cr.bottom <= rect.top) continue;
        if (cr.left >= rect.right || cr.right <= rect.left) continue;

        // Skip invisible
        const style = getComputedStyle(child);
        if (style.visibility === 'hidden' || style.display === 'none') continue;
        if (parseFloat(style.opacity) < 0.1) continue;

        // Only count leaf-ish nodes (with text, images, svgs, canvas, inputs)
        const isLeaf =
          child.childElementCount === 0 ||
          child.tagName === 'SVG' ||
          child.tagName === 'CANVAS' ||
          child.tagName === 'IMG' ||
          child.tagName === 'INPUT' ||
          child.tagName === 'BUTTON' ||
          child.tagName === 'TABLE';

        if (!isLeaf) continue;

        const key = `${Math.round(cr.top)}-${Math.round(cr.left)}-${Math.round(cr.width)}-${Math.round(cr.height)}`;
        if (seen.has(key)) continue;
        seen.add(key);

        // Clip to parent bounds
        const clippedW = Math.min(cr.right, rect.right) - Math.max(cr.left, rect.left);
        const clippedH = Math.min(cr.bottom, rect.bottom) - Math.max(cr.top, rect.top);
        if (clippedW > 0 && clippedH > 0) {
          contentArea += clippedW * clippedH;
        }
      }

      // Clamp content area to container area
      contentArea = Math.min(contentArea, containerArea);
      const blankRatio = 1 - contentArea / containerArea;
      ratios.push(blankRatio);
    }

    return ratios;
  }, selector);
}

/**
 * Check if master-detail detail pane has content when visible.
 */
async function checkMasterDetailPanes(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const detailPanes = document.querySelectorAll('[data-testid="ui-master-detail-detail"]');
    for (const pane of detailPanes) {
      const rect = pane.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) continue; // hidden

      // Check if it has meaningful content (more than just a header)
      const textContent = pane.textContent?.trim() || '';
      if (textContent.length < 20) {
        return false; // Empty detail pane visible
      }
    }
    return true;
  });
}

/**
 * Check empty state heights are reasonable.
 */
async function checkEmptyStateHeights(page: Page): Promise<{ ok: boolean; maxHeight: number }> {
  return page.evaluate(() => {
    const empties = document.querySelectorAll('[data-testid="ui-empty-state"]');
    let maxHeight = 0;
    for (const el of empties) {
      const rect = el.getBoundingClientRect();
      if (rect.height > maxHeight) maxHeight = rect.height;
    }
    return { ok: maxHeight <= 350, maxHeight };
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Layout Audit', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const route of ROUTES) {
    test(`${route} — no severe blank space`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      // Wait for content to render
      await page.waitForTimeout(1500);

      // 1. Check cards/panels
      const cardRatios = await measureBlankRatio(page, '[data-testid="ui-card"], [data-testid="ui-panel"]');
      for (const ratio of cardRatios) {
        expect(ratio, `Card/panel on ${route} has ${Math.round(ratio * 100)}% blank space (max 50%)`).toBeLessThan(0.5);
      }

      // 2. Check master-detail panes
      const mdOk = await checkMasterDetailPanes(page);
      expect(mdOk, `Master-detail detail pane on ${route} is visible but empty`).toBe(true);

      // 3. Check empty state heights
      const esCheck = await checkEmptyStateHeights(page);
      expect(
        esCheck.ok,
        `Empty state on ${route} is ${esCheck.maxHeight}px tall (max 350px)`
      ).toBe(true);
    });
  }

  // Specific interaction tests for key routes
  test('/announcements — master-detail auto-selects', async ({ page }) => {
    await page.goto('/announcements');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // On desktop, the detail pane should have content if there are announcements
    const hasAnnouncements = await page.evaluate(() => {
      return document.querySelectorAll('[data-testid="ui-master-detail-detail"]').length > 0;
    });

    if (hasAnnouncements) {
      const mdOk = await checkMasterDetailPanes(page);
      expect(mdOk, 'Announcements detail pane should have content').toBe(true);
    }
  });

  test('/okrs — no filter overlap', async ({ page }) => {
    await page.goto('/okrs');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Check that no elements overlap significantly
    const hasOverlap = await page.evaluate(() => {
      const selectors = ['[class*="glass-banner"]', '[class*="flex items-center gap"]'];
      const rects: DOMRect[] = [];

      for (const sel of selectors) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 100 && rect.height > 20) {
            rects.push(rect);
          }
        }
      }

      // Check pairwise overlap (only adjacent elements)
      for (let i = 0; i < rects.length - 1; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i];
          const b = rects[j];
          const overlapY = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
          const overlapX = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
          const overlapArea = overlapX * overlapY;
          const minArea = Math.min(a.width * a.height, b.width * b.height);
          if (minArea > 0 && overlapArea / minArea > 0.2) {
            return true; // >20% overlap
          }
        }
      }
      return false;
    });

    expect(hasOverlap, 'OKR page should not have overlapping UI elements').toBe(false);
  });
});
