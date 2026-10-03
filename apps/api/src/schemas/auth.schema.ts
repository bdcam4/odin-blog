import * as z from "zod";

export const credentialsSchema = z.object({
    email: z.email(),
    password: z.string().min(8).max(200),
});

export const refreshCookieSchema = z.object({
    refreshToken: z.string().min(1),
});

export const accessTokenPayloadSchema = z.object({
    typ: z.literal("access"),
    sub: z
        .string()
        .regex(/^[1-9]\d*$/)
        .transform(Number)
        .refine(Number.isSafeInteger),
    email: z.email(),
    isAdmin: z.boolean(),
    sid: z.uuid(),
});

export const registerBodySchema = credentialsSchema;
export const loginBodySchema = credentialsSchema;

export type RegisterInput = z.infer<typeof registerBodySchema>;
export type LoginInput = z.infer<typeof loginBodySchema>;
