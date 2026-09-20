import type { Request, Response } from "express";
import type { ValidatedLocals } from "../middleware/validate-request.js";
import type { registerBodySchema, loginBodySchema, refreshBodySchema } from "../schemas/auth.schema.js";
import * as authService from "../services/auth.service.js"

export async function register(_req: Request, res: Response<unknown, ValidatedLocals<{ body: typeof registerBodySchema }>>) {
    const body = res.locals.validated.body;
    const user = await authService.register(body);
    return res.status(201).json({ user: { id: user.id, email: user.email } });
}

export async function login(_req: Request, res: Response<unknown, ValidatedLocals<{ body: typeof loginBodySchema }>>) {
    const body = res.locals.validated.body;
    const result = await authService.login(body);
    return res.status(200).json(result);
}

export async function refresh(_req: Request, res: Response<unknown, ValidatedLocals<{ body: typeof refreshBodySchema }>>) {
    const body = res.locals.validated.body;
    const result = await authService.refresh(body.refreshToken);
    return res.status(200).json(result);
}
