import { Router } from "express";
import { validateRequest } from "../middleware/validate-request.js";
import {
    createPostBodySchema,
    listPostsQuerySchema,
    postSlugParamsSchema,
    postIdParamsSchema,
} from "../schemas/post.schema.js";
import { optionalAuth, requireAuth } from "../middleware/authenticate.js";
import * as postController from "../controllers/post.controller.js";

const postRoutes = Router();

/**
 * GET /api/posts?page=1&limit=20
 */
postRoutes.get(
    "/",
    optionalAuth,
    validateRequest({ query: listPostsQuerySchema }),
    postController.list,
);

/**
 * GET /api/posts/:slug
 */
postRoutes.get(
    "/:slug",
    optionalAuth,
    validateRequest({ params: postSlugParamsSchema }),
    postController.getBySlug,
);

/**
 * POST /api/posts
 */
postRoutes.post(
    "/",
    requireAuth,
    validateRequest({ body: createPostBodySchema }),
    postController.create,
);

/**
 * DELETE /api/posts/:id
 */
postRoutes.delete(
    "/:id",
    requireAuth,
    validateRequest({ params: postIdParamsSchema }),
    postController.remove,
);

export default postRoutes;
