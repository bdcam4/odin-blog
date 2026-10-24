import type { Request, Response } from "express";
import type { ValidatedLocals } from "../middleware/validate-request.js";
import {
    listPostsQuerySchema,
    type ListPostsQuery,
} from "../schemas/post.schema.ts";
import * as postService from "../services/post.service.js";

export async function listPosts(
    _req: Request,
    res: Response<unknown, ValidatedLocals<{ query: typeof listPostsQuerySchema }>>,
) {
    const query = res.locals.validated.query as ListPostsQuery;
    const result = await postService.listPosts(query, _req.user);

    return res.status(200).json(result);
}
