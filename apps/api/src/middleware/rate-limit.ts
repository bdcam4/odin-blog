import { rateLimit } from "express-rate-limit";
import { PROBLEM_TYPE_BASE } from "../errors/app-error.js";

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

function createLimiter(windowMs: number, limit: number) {
    return rateLimit({
        windowMs,
        limit,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429)
                .type("application/problem+json")
                .json({
                    type: `${PROBLEM_TYPE_BASE}/rate-limit-exceeded`,
                    title: "Too many requests",
                    status: 429,
                    detail: "Too many requests. Try again later.",
                    instance: req.originalUrl,
                });
        },
    });
}

export const apiLimiter = createLimiter(FIFTEEN_MINUTES, 300);
export const loginLimiter = createLimiter(FIFTEEN_MINUTES, 10);
export const registerLimiter = createLimiter(ONE_HOUR, 5);
export const refreshLimiter = createLimiter(FIFTEEN_MINUTES, 30);
