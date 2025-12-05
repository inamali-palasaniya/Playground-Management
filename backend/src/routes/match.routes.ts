import { Router } from 'express';
import { createMatch, getMatches, getMatchById } from '../controllers/match.controller';

const router = Router();

router.post('/', createMatch);
router.get('/', getMatches);
router.get('/:id', getMatchById);

export default router;
