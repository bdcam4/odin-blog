import type { Request, Response } from "express";
import type { ValidatedLocals } from "../middleware/validate-request.js";
import type { registerBodySchema, loginBodySchema } from "../schemas/auth.schema.js";
import type {
    RefreshTokenLocals,
    OptionalRefreshTokenLocals,
} from "../middleware/require-refresh-token.js";
import * as authService from "../services/auth.service.js";
import { UnauthorisedError } from "../errors/app-error.js";

/** Creates an account from validated credentials and returns only public user fields. */
export async function register(
    _req: Request,
    res: Response<unknown, ValidatedLocals<{ body: typeof registerBodySchema }>>,
) {
    const body = res.locals.validated.body;
    const user = await authService.register(body);
    return res.status(201).json({ user: { id: user.id, email: user.email } });
}

/**
 * Authenticates credentials and sets the refresh token as an HTTP-only cookie,
 * omitting it from the JSON body.
 */
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

/** Ends the session when a refresh token is present, clears the cookie, and returns 204. */
export async function logout(_req: Request, res: Response<unknown, OptionalRefreshTokenLocals>) {
    await authService.logout(res.locals.refreshToken);

    res.clearCookie("__Secure-refresh", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/api/auth",
    });

    return res.sendStatus(204);
}

/**
 * Rotates the session's refresh token, sets its replacement cookie, and returns
 * fresh access credentials.
 */
export async function refresh(_req: Request, res: Response<unknown, RefreshTokenLocals>) {
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

/** Returns the current session's CSRF token with caching disabled. */
export async function csrf(_req: Request, res: Response<unknown, RefreshTokenLocals>) {
    const body = await authService.csrf(res.locals.refreshToken);
    res.set("Cache-Control", "no-store");
    return res.status(200).json(body);
}

/** Loads the profile for the authenticated user; rejects the request if the account no longer exists. */
export async function me(req: Request, res: Response) {
    if (!req.user) {
        throw new UnauthorisedError("Invalid or expired token.");
    }
    const body = await authService.getCurrentUser(req.user.id);
    return res.status(200).json(body);
}
