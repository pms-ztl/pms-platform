import { Router } from 'express';
import { integrationsController } from './integrations.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

// Public webhook endpoint (no auth required, but should validate signatures)
router.post('/webhook/:type/:tenantId', integrationsController.handleWebhook);

// Protected routes
router.use(authenticate);

// Get available connectors (any authenticated user can view)
router.get('/connectors', integrationsController.getConnectors);

// Get tenant's integrations (admin only)
router.get(
  '/',
  authorize({ roles: ['ADMIN', 'HR_ADMIN'] }),
  integrationsController.getIntegrations
);

// Get specific integration
router.get(
  '/:id',
  authorize({ roles: ['ADMIN', 'HR_ADMIN'] }),
  integrationsController.getIntegration
);

// Create integration
router.post(
  '/',
  authorize({ roles: ['ADMIN'] }),
  integrationsController.createIntegration
);

// Update integration
router.put(
  '/:id',
  authorize({ roles: ['ADMIN'] }),
  integrationsController.updateIntegration
);

// Delete integration
router.delete(
  '/:id',
  authorize({ roles: ['ADMIN'] }),
  integrationsController.deleteIntegration
);

// Test connection
router.post(
  '/:id/test',
  authorize({ roles: ['ADMIN'] }),
  integrationsController.testConnection
);

// Trigger sync
router.post(
  '/:id/sync',
  authorize({ roles: ['ADMIN'] }),
  integrationsController.triggerSync
);

// Get sync history
router.get(
  '/:id/sync-history',
  authorize({ roles: ['ADMIN', 'HR_ADMIN'] }),
  integrationsController.getSyncHistory
);

export default router;
