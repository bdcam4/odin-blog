import type { NextFunction, Request, Response } from "express";
import { NotFoundError } from "../errors/app-error.js";

// Runs when the request matched no router; must be registered after all routers.
// Registers a NotFoundError on the error track rather than sending a response,
// so error formatting stays in one place.
export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
    next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
}
