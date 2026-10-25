import type { NextFunction, Request, Response } from "express";
import { AppError, PROBLEM_TYPE_BASE, type ProblemDetails } from "../errors/app-error.js";

/**
 * Terminal Express error middleware: converts any failure into an
 * RFC 9457 problem details response.
 *
 * Must keep the 4-parameter signature — Express identifies error
 * middleware by arity, so `_next` exists only to preserve it.
 * Runs when something above it calls `next(error)` or throws.
 *
 * @param err - The thrown/rejected value. Typed `unknown` because
 *   JavaScript can throw anything.
 * @param _next - Unused; present for arity. Forwards `err` if
 *   headers were already sent.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
    // A response already started streaming; it cannot be replaced.
    if (res.headersSent) {
        _next(err);
        return;
    }

    // Known application error: convert it into a problem details body.
    if (err instanceof AppError) {
        const problem: ProblemDetails = {
            type: `${PROBLEM_TYPE_BASE}/${err.type}`,
            title: err.title,
            status: err.status,
            detail: err.detail,
            instance: req.originalUrl,
            // Optional fields: include only when set.
            ...(err.code !== undefined && { code: err.code }),
            ...(err.errors !== undefined && { errors: err.errors }),
        };

        res.status(err.status).type("application/problem+json").json(problem);
        return;
    }

    // Unexpected error: log everything server-side, reveal nothing to the client.
    console.error(err);

    const problem: ProblemDetails = {
        type: `${PROBLEM_TYPE_BASE}/internal-error`,
        title: "Internal server error",
        status: 500,
        detail: "An unexpected error occurred",
        instance: req.originalUrl,
    };

    res.status(500).type("application/problem+json").json(problem);
}
