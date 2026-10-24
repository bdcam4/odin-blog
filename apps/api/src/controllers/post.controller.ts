import type { Request, Response } from "express";
import type { ValidatedLocals } from "../middleware/validate-request.js";
import {
    createPostBodySchema,
    listPostsQuerySchema,
    type CreatePostBody,
    type ListPostsQuery,
} from "../schemas/post.schema.ts";
import * as postService from "../services/post.service.js";
import { UnauthorisedError } from "../errors/app-error.js";

export async function list(
    req: Request,
    res: Response<unknown, ValidatedLocals<{ query: typeof listPostsQuerySchema }>>,
) {
    const query = res.locals.validated.query as ListPostsQuery;
    const result = await postService.list(query, req.user);

    return res.status(200).json(result);
}

export async function create(
    req: Request,
    res: Response<unknown, ValidatedLocals<{ body: typeof createPostBodySchema }>>,
) {
    const user = req.user;
    if (!user) {
        throw new UnauthorisedError("Invalid or expired token.");
    }

    const body = res.locals.validated.body as CreatePostBody;
    const result = await postService.create(body, user);

    res.location(`/api/posts/${encodeURIComponent(result.slug)}`);
    return res.status(201).json({ post: result });
}
