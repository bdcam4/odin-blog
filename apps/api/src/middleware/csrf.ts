import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import { createHash, randomBytes } from "node:crypto";
import { UnauthorisedError, ForbiddenError } from "../errors/app-error.js";
import { env } from "../config/env.js";

/**
 * Require an exact allowed browser Origin on cookie-authenticated auth routes.
 * Keep this allowlist separate from Host/X-Forwarded-Host, which come from the
 * request and are not a trusted source of allowed frontend origins.
 */
export function requireAllowedOrigin(req: Request, _res: Response, next: NextFunction) {
    const origin = req.get("Origin");

    if (!origin || !env.FRONTEND_ORIGINS.includes(origin)) {
        return next(new ForbiddenError("Origin not allowed."));
    }

    next();
}

export function createCsrfToken() {
    return randomBytes(32).toString("hex");
}

export async function requireCsrf(req: Request, res: Response, next: NextFunction) {
    const now = new Date();
    const refreshToken = res.locals.refreshToken;
    const refreshTokenHash = createHash("sha256").update(refreshToken).digest("hex");

    const session = await prisma.session.findUnique({
        where: {
            refreshTokenHash,
            expiresAt: { gt: now },
        },
    });

    if (!session) {
        throw new UnauthorisedError("Invalid or expired token.");
    }

    const csrfToken = req.get("X-CSRF-Token");
    if (!csrfToken || csrfToken !== session.csrfToken) {
        throw new ForbiddenError("Missing or invalid CSRF token.");
    }

    next();
}

export async function requireCsrfIfSessionExists(req: Request, res: Response, next: NextFunction) {
    const now = new Date();

    const refreshToken = res.locals.refreshToken;
    if (!refreshToken) {
        return next();
    }

    const refreshTokenHash = createHash("sha256").update(refreshToken).digest("hex");

    const session = await prisma.session.findUnique({
        where: {
            refreshTokenHash,
            expiresAt: { gt: now },
        },
    });

    if (!session) {
        return next();
    }

    const csrfToken = req.get("X-CSRF-Token");
    if (!csrfToken || csrfToken !== session.csrfToken) {
        throw new ForbiddenError("Missing or invalid CSRF token.");
    }

    next();
}
