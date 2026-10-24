import { Router } from "express";
import { validateRequest } from "../middleware/validate-request.js";
import {
    createPostBodySchema,
    listPostsQuerySchema,
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
 * POST /api/posts
 */
postRoutes.post(
    "/",
    requireAuth,
    validateRequest({ body: createPostBodySchema }),
    postController.create,
);

export default postRoutes;
