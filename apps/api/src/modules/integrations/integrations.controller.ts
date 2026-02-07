import { Request, Response, NextFunction } from 'express';
import { integrationsService } from './integrations.service';
import { logger } from '../../utils/logger';

export class IntegrationsController {
  /**
   * GET /api/v1/integrations/connectors
   * Get available integration connectors
   */
  async getConnectors(req: Request, res: Response, next: NextFunction) {
    try {
      const connectors = integrationsService.getAvailableConnectors();

      res.json({
        success: true,
        data: connectors,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/integrations
   * Get tenant's integrations
   */
  async getIntegrations(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;

      const integrations = await integrationsService.getTenantIntegrations(tenantId);

      res.json({
        success: true,
        data: integrations,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/integrations/:id
   * Get a specific integration
   */
  async getIntegration(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;
      const { id } = req.params;

      const integration = await integrationsService.getIntegration(id, tenantId);

      res.json({
        success: true,
        data: integration,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/integrations
   * Create a new integration
   */
  async createIntegration(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, id: userId } = req.user!;
      const { type, name, config } = req.body;

      const integration = await integrationsService.createIntegration(
        tenantId,
        userId,
        type,
        name,
        config
      );

      res.status(201).json({
        success: true,
        data: integration,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/integrations/:id
   * Update an integration
   */
  async updateIntegration(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, id: userId } = req.user!;
      const { id } = req.params;
      const updates = req.body;

      const integration = await integrationsService.updateIntegration(
        id,
        tenantId,
        userId,
        updates
      );

      res.json({
        success: true,
        data: integration,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/integrations/:id
   * Delete an integration
   */
  async deleteIntegration(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, id: userId } = req.user!;
      const { id } = req.params;

      await integrationsService.deleteIntegration(id, tenantId, userId);

      res.json({
        success: true,
        message: 'Integration deleted',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/integrations/:id/test
   * Test integration connection
   */
  async testConnection(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;
      const { id } = req.params;

      const result = await integrationsService.testConnection(id, tenantId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/integrations/:id/sync
   * Trigger a manual sync
   */
  async triggerSync(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, id: userId } = req.user!;
      const { id } = req.params;
      const { direction } = req.body;

      const syncJob = await integrationsService.triggerSync(id, tenantId, userId, direction);

      res.json({
        success: true,
        data: syncJob,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/integrations/:id/sync-history
   * Get sync job history
   */
  async getSyncHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;
      const { id } = req.params;
      const { limit } = req.query;

      const history = await integrationsService.getSyncHistory(
        id,
        tenantId,
        limit ? parseInt(limit as string) : undefined
      );

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/integrations/webhook/:type/:tenantId
   * Handle incoming webhooks
   */
  async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, tenantId } = req.params;
      const signature = req.headers['x-signature'] as string;

      await integrationsService.handleWebhook(type as any, tenantId, req.body, signature);

      res.json({ success: true });
    } catch (error) {
      logger.error('Webhook handling failed', { error });
      // Always return 200 for webhooks to prevent retries
      res.json({ success: false });
    }
  }
}

export const integrationsController = new IntegrationsController();
