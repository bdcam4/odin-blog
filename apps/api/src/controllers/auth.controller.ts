import type { Request, Response } from "express";
import type { ValidatedLocals } from "../middleware/validate-request.js";
import type {
    registerBodySchema,
    loginBodySchema,
} from "../schemas/auth.schema.js";
import type { RefreshTokenLocals } from "../middleware/require-refresh-token.js";
import * as authService from "../services/auth.service.js";

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
