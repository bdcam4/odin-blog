import type { Request, Response } from "express";
import type { ValidatedLocals } from "../middleware/validate-request.js";
import type {
    registerBodySchema,
    loginBodySchema,
} from "../schemas/auth.schema.js";
import type {
    RefreshTokenLocals,
    OptionalRefreshTokenLocals
} from "../middleware/require-refresh-token.js";
import * as authService from "../services/auth.service.js";
import { UnauthorisedError } from "../errors/app-error.js";

export async function register(
    _req: Request,
    res: Response<
        unknown,
        ValidatedLocals<{ body: typeof registerBodySchema }>
    >,
) {
    const body = res.locals.validated.body;
    const user = await authService.register(body);
    return res.status(201).json({ user: { id: user.id, email: user.email } });
}

export async function login(
    _req: Request,
    res: Response<unknown, ValidatedLocals<{ body: typeof loginBodySchema }>>,
) {
    const body = res.locals.validated.body;
    const result = await authService.login(body);

    const { refreshToken, ...responseBody } = result;

    res.cookie("__Secure-refresh", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/api/auth",
        expires: result.refreshExpiresAt,
    });

    return res.status(200).json(responseBody);
}

export async function logout(
    _req: Request,
    res: Response<unknown, OptionalRefreshTokenLocals>,
) {
    await authService.logout(res.locals.refreshToken);

    res.clearCookie("__Secure-refresh", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/api/auth",
    });

    return res.sendStatus(204);
}

export async function refresh(
    _req: Request,
    res: Response<unknown, RefreshTokenLocals>,
) {
    const result = await authService.refresh(res.locals.refreshToken);

    const { refreshToken, ...responseBody } = result;

    res.cookie("__Secure-refresh", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/api/auth",
        expires: result.refreshExpiresAt,
    });

    return res.status(200).json(responseBody);
}

export async function csrf(
    _req: Request,
    res: Response<unknown, RefreshTokenLocals>,
) {
    const body = await authService.csrf(res.locals.refreshToken);
    res.set("Cache-Control", "no-store");
    return res.status(200).json(body);
}

export async function me(
    req: Request,
    res: Response,
) {
    if (!req.user) {
        throw new UnauthorisedError("Invalid or expired token.");
    }
    const body = await authService.getCurrentUser(req.user.id);
    return res.status(200).json(body);
}
