import type { Request, Response } from "express";
import type { ValidatedLocals } from "../middleware/validate-request.js";
import type {
    registerBodySchema,
    loginBodySchema,
} from "../schemas/auth.schema.js";
import { refreshCookieSchema } from "../schemas/auth.schema.js";
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
    req: Request,
    res: Response,
) {
    const parsedCookie = refreshCookieSchema.safeParse({
        refreshToken: req.cookies?.["__Secure-refresh"],
    });

    if (!parsedCookie.success) {
        throw new UnauthorisedError("Invalid or expired token.");
    }

    const result = await authService.refresh(parsedCookie.data.refreshToken);

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
