import type { NextFunction, Request, Response } from "express";
import { UnauthorisedError } from "../errors/app-error.js";
import { refreshCookieSchema } from "../schemas/auth.schema.js";

export type RefreshTokenLocals = {
    refreshToken: string;
};

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
