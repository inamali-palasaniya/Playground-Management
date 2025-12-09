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

const router = Router();

// Subscription Plans
router.get('/plans', getSubscriptionPlans);
router.post('/plans', createSubscriptionPlan);

// User Subscriptions
router.get('/user/:userId', getUserSubscriptions);
router.get('/active/:userId', getActiveSubscription);
router.get('/:id', getSubscriptionById);
router.post('/', createSubscription);
router.put('/:id/status', updateSubscriptionStatus);

// Fee Ledger
router.post('/fees', addFee);
router.get('/fees/:user_id', getFeeLedger);

export default router;
