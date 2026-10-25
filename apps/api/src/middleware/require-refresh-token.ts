import type { NextFunction, Request, Response } from "express";
import { UnauthorisedError } from "../errors/app-error.js";
import { refreshCookieSchema, optionalCookieSchema } from "../schemas/auth.schema.js";

export type RefreshTokenLocals = {
    refreshToken: string;
};

export type OptionalRefreshTokenLocals = {
    refreshToken?: string;
};

/** Requires a valid refresh cookie and stores its token in `res.locals` for downstream handlers. */
export function requireRefreshToken(
    req: Request,
    res: Response<unknown, RefreshTokenLocals>,
    next: NextFunction,
) {
    const result = refreshCookieSchema.safeParse({
        refreshToken: req.cookies?.["__Secure-refresh"],
    });

    if (!result.success) {
        return next(new UnauthorisedError("Invalid or expired token."));
    }

    res.locals.refreshToken = result.data.refreshToken;
    next();
}

/** Stores a valid refresh cookie when present; missing or malformed cookies become `undefined`. */
export function optionalRefreshToken(
    req: Request,
    res: Response<unknown, OptionalRefreshTokenLocals>,
    next: NextFunction,
) {
    const result = optionalCookieSchema.safeParse({
        refreshToken: req.cookies?.["__Secure-refresh"],
    });

    res.locals.refreshToken = result.success ? result.data.refreshToken : undefined;

    next();
}
