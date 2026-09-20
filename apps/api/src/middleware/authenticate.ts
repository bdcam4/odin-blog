import type { NextFunction, Request, Response } from "express";
import * as jose from "jose";
import { env } from "../config/env.js";
import { AppError, UnauthorisedError } from "../errors/app-error.js";
import type { AuthUser } from "../types.js";

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

export async function requireAuth(
    req: Request,
    _res: Response,
    next: NextFunction
) {
    try {
        const header = req.headers.authorization;
        if (!header?.startsWith("Bearer ")) {
            throw new UnauthorisedError("Invalid or expired token.");
        }

        const accessToken = header.slice("Bearer ".length);
        const secret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

        const { payload } = await jose.jwtVerify(accessToken, secret);

        if (payload.typ !== "access") {
            throw new UnauthorisedError("Invalid or expired token.");
        }

        req.user = {
            id: Number(payload.sub),
            email: payload.email as string,
            isAdmin: payload.isAdmin as boolean,
        };

        next();
    } catch (err) {
        next(err instanceof AppError ? err : new UnauthorisedError("Invalid or expired token."));
    }
}
