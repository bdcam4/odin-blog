import { Router } from "express";
import { validateRequest } from "../middleware/validate-request.js";
import {
    registerBodySchema,
    loginBodySchema,
} from "../schemas/auth.schema.js";
import * as authController from "../controllers/auth.controller.js";
import { optionalRefreshToken, requireRefreshToken } from "../middleware/require-refresh-token.js";
import {
    registerLimiter,
    loginLimiter,
    refreshLimiter,
    csrfLimiter
} from "../middleware/rate-limit.js";
import {
    requireAllowedOrigin,
    requireCsrf,
    requireCsrfIfSessionExists,
} from "../middleware/csrf.js";
import { requireAuth } from "../middleware/authenticate.js";

const authRoutes = Router();

authRoutes.post(
    "/register",
    registerLimiter,
    validateRequest({ body: registerBodySchema }),
    authController.register,
);

authRoutes.post(
    "/login",
    loginLimiter,
    requireAllowedOrigin,
    validateRequest({ body: loginBodySchema }),
    authController.login,
);

authRoutes.post(
    "/logout",
    requireAllowedOrigin,
    optionalRefreshToken,
    requireCsrfIfSessionExists,
    authController.logout,
);

authRoutes.post(
    "/refresh",
    refreshLimiter,
    requireAllowedOrigin,
    requireRefreshToken,
    requireCsrf,
    authController.refresh,
);

authRoutes.get(
    "/csrf",
    csrfLimiter,
    requireAllowedOrigin,
    requireRefreshToken,
    authController.csrf,
);

authRoutes.get(
    "/me",
    //meLimiter,
    requireAuth,
    authController.me,
);

export default authRoutes;
