import type { NextFunction, Request, Response } from "express";
import * as jose from "jose";
import { env } from "../config/env.js";
import { AppError, UnauthorisedError } from "../errors/app-error.js";
import { accessTokenPayloadSchema } from "../schemas/auth.schema.js";
import type { AuthUser } from "../types.js";

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

async function authenticate(req: Request, next: NextFunction, optional: boolean) {
    try {
        const header = req.headers.authorization;
        if (!header?.startsWith("Bearer ")) {
            if (optional && !header) {
                next();
                return;
            }
            throw new UnauthorisedError("Invalid or expired token.");
        }

        const accessToken = header.slice("Bearer ".length);
        const secret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

        const { payload } = await jose.jwtVerify(accessToken, secret, {
            requiredClaims: ["sub", "exp"],
            algorithms: ["HS256"],
        });

        const result = accessTokenPayloadSchema.safeParse(payload);
        if (!result.success) {
            throw new UnauthorisedError("Invalid or expired token.");
        }

        req.user = {
            id: result.data.sub,
            email: result.data.email,
            isAdmin: result.data.isAdmin,
        };

        next();
    } catch (err) {
        next(err instanceof AppError ? err : new UnauthorisedError("Invalid or expired token."));
    }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
    return authenticate(req, next, false);
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
    return authenticate(req, next, true);
}
