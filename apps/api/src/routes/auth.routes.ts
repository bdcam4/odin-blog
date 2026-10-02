import { Router } from "express";
import { validateRequest } from "../middleware/validate-request.js";
import {
    registerBodySchema,
    loginBodySchema,
    refreshBodySchema,
} from "../schemas/auth.schema.js";
import * as authController from "../controllers/auth.controller.js";
import {
    registerLimiter,
    loginLimiter,
    refreshLimiter
} from "../middleware/rate-limit.js";

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
    validateRequest({ body: loginBodySchema }),
    authController.login,
);

authRoutes.post(
    "/refresh",
    refreshLimiter,
    validateRequest({ body: refreshBodySchema }),
    authController.refresh,
);

export default authRoutes;
