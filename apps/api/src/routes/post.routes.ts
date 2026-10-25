import { Router } from "express";
import { validateRequest } from "../middleware/validate-request.js";
import {
    createPostBodySchema,
    listPostsQuerySchema,
    postSlugParamsSchema,
    postIdParamsSchema,
    updatePostBodySchema,
} from "../schemas/post.schema.js";
import {
    createPostCommentBodySchema,
    listPostCommentsQuerySchema,
    postCommentsParamsSchema,
} from "../schemas/comment.schema.js";
import { optionalAuth, requireAuth } from "../middleware/authenticate.js";
import * as postController from "../controllers/post.controller.js";
import * as commentController from "../controllers/comment.controller.js";

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
 * PATCH /api/posts/:id
 */
postRoutes.patch(
    "/:id",
    requireAuth,
    validateRequest({
        params: postIdParamsSchema,
        body: updatePostBodySchema,
    }),
    postController.update,
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

/**
 * GET /api/posts/:postId/comments?page=1&limit=20
 */
postRoutes.get(
    "/:postId/comments",
    validateRequest({ params: postCommentsParamsSchema, query: listPostCommentsQuerySchema }),
    commentController.list,
);

/**
 * POST /api/posts/:postId/comments
 */
postRoutes.post(
    "/:postId/comments",
    requireAuth,
    validateRequest({ params: postCommentsParamsSchema, body: createPostCommentBodySchema }),
    commentController.create,
);

export default postRoutes;
