import type { Request, Response } from "express";
import { UnauthorisedError } from "../errors/app-error.js";
import type { ValidatedLocals } from "../middleware/validate-request.js";
import type {
    commentIdParamsSchema,
    createPostCommentBodySchema,
    listPostCommentsQuerySchema,
    postCommentsParamsSchema,
    CommentIdParams,
    CreatePostCommentBody,
    ListPostCommentsQuery,
    PostCommentsParams,
} from "../schemas/comment.schema.js";
import * as commentService from "../services/comment.service.js";

/** Returns a paginated list of comments for a published post. */
export async function list(
    _req: Request,
    res: Response<
        unknown,
        ValidatedLocals<{
            params: typeof postCommentsParamsSchema;
            query: typeof listPostCommentsQuerySchema;
        }>
    >,
) {
    const { postId } = res.locals.validated.params as PostCommentsParams;
    const query = res.locals.validated.query as ListPostCommentsQuery;
    const result = await commentService.listForPost(postId, query);

    return res.status(200).json(result);
}

/** Creates a comment by the authenticated user on a published post. */
export async function create(
    req: Request,
    res: Response<
        unknown,
        ValidatedLocals<{
            params: typeof postCommentsParamsSchema;
            body: typeof createPostCommentBodySchema;
        }>
    >,
) {
    const user = req.user;
    if (!user) {
        throw new UnauthorisedError("Invalid or expired token.");
    }

    const { postId } = res.locals.validated.params as PostCommentsParams;
    const body = res.locals.validated.body as CreatePostCommentBody;
    const comment = await commentService.createForPost(postId, body, user);

    res.location(`/api/comments/${comment.id}`);
    return res.status(201).json({ comment });
}

/** Deletes the caller's comment (or any comment for an admin) and responds with 204. */
export async function remove(
    req: Request,
    res: Response<unknown, ValidatedLocals<{ params: typeof commentIdParamsSchema }>>,
) {
    const user = req.user;
    if (!user) {
        throw new UnauthorisedError("Invalid or expired token.");
    }

    const { id } = res.locals.validated.params as CommentIdParams;
    await commentService.remove(id, user);

    return res.sendStatus(204);
}
