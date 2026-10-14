import { Router } from 'express';

import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import storyRoutes from './story.routes.js';
import keywordRoutes from './keyword.routes.js';
import feedRoutes from './feed.routes.js';

/**
 * Version 1 of the API.
 *
 * The prefix is mounted in app.js and the version lives in one place, so
 * introducing a v2 is a second router and a second mount rather than a rewrite.
 * The judgment behind versioning at all, given that nothing has shipped: the
 * frontend is a separate deployable, so it and the API will be deployed
 * independently the first time either changes, and a version in the path is
 * what makes that safe. A break can be a new prefix instead of a coordinated
 * release.
 *
 * `/health` is deliberately not here. It is infrastructure rather than API, so
 * it sits unversioned at the root of the app — an orchestrator probing it
 * should not have to know which version is current.
 */

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/stories', storyRoutes);
router.use('/keywords', keywordRoutes);
router.use('/feed', feedRoutes);

export default router;
