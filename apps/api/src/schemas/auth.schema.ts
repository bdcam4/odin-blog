import * as z from "zod";

export const credentialsSchema = z.object({
    email: z.email(),
    password: z.string().min(8).max(200)
});

export const refreshBodySchema = z.object({
    refreshToken: z.string().min(1)
})

export const registerBodySchema = credentialsSchema;
export const loginBodySchema = credentialsSchema;

export type RegisterInput = z.infer<typeof registerBodySchema>;
export type LoginInput = z.infer<typeof loginBodySchema>;
export type RefreshInput = z.infer<typeof refreshBodySchema>;
