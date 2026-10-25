import "dotenv/config";
import * as z from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1),
    JWT_ACCESS_SECRET: z.string().min(32),
    PEPPER_SECRET: z.string().min(16),
    // Comma-separated exact browser origins. The default supports Angular's
    // usual local dev server; configure the deployed frontend origin(s) later.
    FRONTEND_ORIGINS: z
        .string()
        .default("http://localhost:4200")
        .transform((value) => value.split(",").map((origin) => origin.trim()))
        .pipe(
            z
                .array(
                    z.url().refine((value) => new URL(value).origin === value, {
                        message:
                            "Each frontend origin must be an origin without a path or trailing slash",
                    }),
                )
                .min(1),
        ),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("Invalid environment config:", z.prettifyError(parsed.error));
    process.exit(1);
}

export const env = parsed.data;
