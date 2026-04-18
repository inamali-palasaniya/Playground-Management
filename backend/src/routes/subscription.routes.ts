import { Router } from 'express';
import {
    getSubscriptionPlans,
    createSubscriptionPlan,
    createSubscription,
    addFee,
    getFeeLedger,
    getUserSubscriptions,
    getActiveSubscription,
    updateSubscriptionStatus,
    getSubscriptionById,
} from '../controllers/subscription.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { checkPermission } from '../middleware/permission.middleware.js';

const router = Router();
router.use(authenticateToken);

// Subscription Plans
router.get('/plans', checkPermission('master_plans', 'view'), getSubscriptionPlans);
router.post('/plans', checkPermission('master_plans', 'add'), createSubscriptionPlan);

// User Subscriptions
router.get('/user/:userId', checkPermission('user', 'view'), getUserSubscriptions);
router.get('/active/:userId', checkPermission('user', 'view'), getActiveSubscription);
router.get('/:id', checkPermission('user', 'view'), getSubscriptionById);
router.post('/', checkPermission('user', 'add'), createSubscription);
router.put('/:id/status', checkPermission('user', 'edit'), updateSubscriptionStatus);

// Fee Ledger
router.post('/fees', checkPermission('finance', 'add'), addFee);
router.get('/fees/:user_id', checkPermission('finance', 'view'), getFeeLedger);

export default router;
