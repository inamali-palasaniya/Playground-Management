import { Router } from 'express';
import {
    getSubscriptionPlans,
    createSubscriptionPlan,
    createSubscription,
    addFee,
    getFeeLedger,
} from '../controllers/subscription.controller';

const router = Router();

router.get('/plans', getSubscriptionPlans);
router.post('/plans', createSubscriptionPlan);
router.post('/', createSubscription);
router.post('/fees', addFee);
router.get('/fees/:user_id', getFeeLedger);

export default router;
