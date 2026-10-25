import * as z from "zod";

export const postCommentsParamsSchema = z.object({
    postId: z.coerce.number().int().positive().max(2_147_483_647),
});

export const commentIdParamsSchema = z.object({
    id: z.coerce.number().int().positive().max(2_147_483_647),
});

export const listPostCommentsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createPostCommentBodySchema = z.object({
    body: z.string().trim().min(1),
});

export type PostCommentsParams = z.infer<typeof postCommentsParamsSchema>;
export type CommentIdParams = z.infer<typeof commentIdParamsSchema>;
export type ListPostCommentsQuery = z.infer<typeof listPostCommentsQuerySchema>;
export type CreatePostCommentBody = z.infer<typeof createPostCommentBodySchema>;
