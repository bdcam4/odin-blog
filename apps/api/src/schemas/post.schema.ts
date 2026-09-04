import * as z from "zod";

export const createPostBodySchema = z.object({
    title: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1),
});

export type CreatePostBody = z.infer<typeof createPostBodySchema>;
