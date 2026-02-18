
import { Router } from 'express';
import { IntegrationController } from '../controllers/integrationController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Public Callback Route (since redirect won't have Auth header)
router.get('/etsy/callback', IntegrationController.etsyCallback);

router.use(authMiddleware);

router.get('/', IntegrationController.getIntegrations);
router.get('/etsy/auth-url', IntegrationController.getEtsyAuthUrl);
router.post('/connect', IntegrationController.connect);
router.delete('/:platform', IntegrationController.disconnect);

export default router;
