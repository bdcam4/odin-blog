import { Router } from "express";
import type { Request, Response } from "express";
import { validateRequest } from "../middleware/validate-request.js";
import { createPostBodySchema, type CreatePostBody } from "../schemas/post.schema.js";
import { requireAuth } from "../middleware/authenticate.js";

const postRoutes = Router();

// Stub route: verifies the authentication, and validation + error pipeline end-to-end.
// Replaced by the real post endpoints (GET /, GET /:slug, PATCH /:id, DELETE /:id).
postRoutes.post("/", 
    requireAuth,
    validateRequest({ body: createPostBodySchema }),
    (_req: Request, res: Response) => {
        const body = res.locals.validated?.body as CreatePostBody;
        res.status(201).json({ title: body.title });
    });

export default postRoutes;
