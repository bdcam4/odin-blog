import type { Request, Response } from "express";
import type { ValidatedLocals } from "../middleware/validate-request.js";
import {
    createPostBodySchema,
    listPostsQuerySchema,
    postSlugParamsSchema,
    postIdParamsSchema,
    updatePostBodySchema,
    type CreatePostBody,
    type ListPostsQuery,
    type PostSlugParams,
    type PostIdParams,
    type UpdatePostBody,
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

export async function getBySlug(
    req: Request,
    res: Response<unknown, ValidatedLocals<{ params: typeof postSlugParamsSchema }>>,
) {
    const params = res.locals.validated.params as PostSlugParams;
    const slug = params.slug;
    const result = await postService.getBySlug(slug, req.user);

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

export async function update(
    req: Request,
    res: Response<
        unknown,
        ValidatedLocals<{ params: typeof postIdParamsSchema; body: typeof updatePostBodySchema }>
    >,
) {
    const user = req.user;
    if (!user) {
        throw new UnauthorisedError("Invalid or expired token.");
    }

    const body = res.locals.validated.body as UpdatePostBody;
    const params = res.locals.validated.params as PostIdParams;
    const id = params.id;
    const result = await postService.update(id, body, user);

    return res.status(200).json({ post: result });
}

export async function remove(
    req: Request,
    res: Response<unknown, ValidatedLocals<{ params: typeof postIdParamsSchema }>>,
) {
    const user = req.user;
    if (!user) {
        throw new UnauthorisedError("Invalid or expired token.");
    }

    const params = res.locals.validated.params as PostIdParams;
    const id = params.id;
    await postService.remove(id, user);

    return res.sendStatus(204);
}
