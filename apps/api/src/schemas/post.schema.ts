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

export const postSlugParamsSchema = z.object({
    slug: z.string().min(1),
});

export const postIdParamsSchema = z.object({
    id: z.coerce.number().int().positive().max(2_147_483_647),
});

export const updatePostBodySchema = z
    .object({
        title: z.string().trim().min(1).max(200).optional(),
        body: z.string().trim().min(1).optional(),
        published: z.boolean().optional(),
    })
    .refine(
        (data) =>
            data.title !== undefined || data.body !== undefined || data.published !== undefined,
        { message: "Provide at least one field to update." },
    );

export type CreatePostBody = z.infer<typeof createPostBodySchema>;
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;
export type PostSlugParams = z.infer<typeof postSlugParamsSchema>;
export type PostIdParams = z.infer<typeof postIdParamsSchema>;
export type UpdatePostBody = z.infer<typeof updatePostBodySchema>;
