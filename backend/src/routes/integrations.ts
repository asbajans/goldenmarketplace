
import { Router } from 'express';
import { IntegrationController } from '../controllers/integrationController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Public Callback Route (since redirect won't have Auth header)
router.get('/etsy/callback', IntegrationController.etsyCallback);

router.use(authMiddleware);

router.get('/', IntegrationController.getIntegrations);
router.get('/etsy/auth-url', IntegrationController.getEtsyAuthUrl);
router.get('/etsy/shipping-profiles', IntegrationController.getEtsyShippingProfiles);
router.get('/etsy/return-policies', IntegrationController.getEtsyReturnPolicies);
router.get('/etsy/readiness-states', IntegrationController.getEtsyReadinessStates);
router.get('/etsy/seller-taxonomy-nodes', IntegrationController.getEtsySellerTaxonomyNodes);
router.get('/etsy/orders', IntegrationController.getEtsyOrders);
router.post('/etsy/orders/sync', IntegrationController.syncEtsyOrders);
router.post('/connect', IntegrationController.connect);
router.delete('/:platform', IntegrationController.disconnect);
router.get('/test/:platform', IntegrationController.testConnection);

export default router;
