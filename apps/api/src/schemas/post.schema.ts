import * as z from "zod";

export const createPostBodySchema = z.object({
    title: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1),
});

export const listPostsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    includeDrafts: z.stringbool().default(false),
});

export type CreatePostBody = z.infer<typeof createPostBodySchema>;
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;
