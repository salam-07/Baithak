import { Router } from 'express';

import validate from '../middlewares/validate.js';
import { requireAuth } from '../middlewares/auth.js';
import * as interestController from '../controllers/interest.controller.js';
import {
  addInterestSchema,
  removeInterestSchema,
  listInterestsQuerySchema,
} from '../validators/interest.validator.js';



const router = Router();

router.get('/', requireAuth, validate({ query: listInterestsQuerySchema }), interestController.listInterests);

router.post('/', requireAuth, validate({ body: addInterestSchema }), interestController.addInterest);

router.delete(
  '/',
  requireAuth,
  validate({ body: removeInterestSchema }),
  interestController.removeInterest,
);

export default router;
