import { Router } from "express";
import { requireAuth } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validate-request.js";
import * as commentController from "../controllers/comment.controller.js";
import { commentIdParamsSchema } from "../schemas/comment.schema.js";

const commentRoutes = Router();

/**
 * DELETE /api/comments/:id
 */
commentRoutes.delete(
    "/:id",
    requireAuth,
    validateRequest({ params: commentIdParamsSchema }),
    commentController.remove,
);

export default commentRoutes;
