import type { NextFunction, Request, Response } from "express";
import type * as z from "zod";
import { ValidationError } from "../errors/app-error.js";

type RequestSchemas = {
    params?: z.ZodTypeAny;
    body?: z.ZodTypeAny;
    query?: z.ZodTypeAny;
};

// Generic container for the parsed request data we store on res.locals.
// Each route can fill in params/body/query with the types inferred from its Zod schemas.
export type ValidatedRequestData<Params = undefined, Body = undefined, Query = undefined> = {
    params: Params;
    body: Body;
    query: Query;
};

// If a schema exists, convert it to the TypeScript type of its parsed output.
// If no schema was provided for that request part, keep it as undefined.
type InferSchema<TSchema extends z.ZodTypeAny | undefined> = TSchema extends z.ZodTypeAny
    ? z.infer<TSchema>
    : undefined;

// Builds the res.locals shape for this specific validateRequest(...) call
// by mapping each provided schema to its inferred parsed type.
export type ValidatedLocals<TSchemas extends RequestSchemas> = {
    validated: ValidatedRequestData<
        InferSchema<TSchemas["params"]>,
        InferSchema<TSchemas["body"]>,
        InferSchema<TSchemas["query"]>
    >;
};

/**
 * Maps Zod issues into our API error shape: [{ path, message }].
 * This is the only file that knows Zod's error format.
 */
function formatIssues(error: z.ZodError) {
    return error.issues.map((issue) => ({
        path: issue.path.map(String).join(".") || "(root)",
        message: issue.message,
    }));
}

/**
 * Validates selected request sections and stores parsed, schema-inferred values in
 * `res.locals.validated`. Invalid input is forwarded as a `ValidationError`.
 */
export function validateRequest<TSchemas extends RequestSchemas>(schema: TSchemas) {
    return (
        req: Request,
        res: Response<unknown, ValidatedLocals<TSchemas>>,
        next: NextFunction,
    ) => {
        // Start with an empty validated object and fill in each section only if that schema exists.
        const validated = {
            params: undefined,
            body: undefined,
            query: undefined,
        } as ValidatedRequestData<
            InferSchema<TSchemas["params"]>,
            InferSchema<TSchemas["body"]>,
            InferSchema<TSchemas["query"]>
        >;

        if (schema.params) {
            const result = schema.params.safeParse(req.params);
            if (!result.success) {
                return next(
                    new ValidationError(
                        "One or more fields are invalid",
                        formatIssues(result.error),
                    ),
                );
            }
            // This assertion stays inside the middleware so controllers can read typed
            // validated data without repeating casts. TS cannot fully connect the generic
            // safeParse result to the conditional type on its own.
            validated.params = result.data as InferSchema<TSchemas["params"]>;
        }

        if (schema.body) {
            const result = schema.body.safeParse(req.body);
            if (!result.success) {
                return next(
                    new ValidationError(
                        "One or more fields are invalid",
                        formatIssues(result.error),
                    ),
                );
            }
            validated.body = result.data as InferSchema<TSchemas["body"]>;
        }

        if (schema.query) {
            const result = schema.query.safeParse(req.query);
            if (!result.success) {
                return next(
                    new ValidationError(
                        "One or more fields are invalid",
                        formatIssues(result.error),
                    ),
                );
            }
            validated.query = result.data as InferSchema<TSchemas["query"]>;
        }

        res.locals.validated = validated;
        next();
    };
}
