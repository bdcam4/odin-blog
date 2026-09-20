import { Router } from 'express';
import { validateRequest } from '../middleware/validate-request.js';
import { registerBodySchema, loginBodySchema, refreshBodySchema } from '../schemas/auth.schema.js';
import * as authController from '../controllers/auth.controller.js';

const authRoutes = Router();

authRoutes.post(
    "/register",
    validateRequest({ body: registerBodySchema }),
    authController.register
);

authRoutes.post(
    "/login",
    validateRequest({ body: loginBodySchema }),
    authController.login
);

authRoutes.post(
    "/refresh",
    validateRequest({ body: refreshBodySchema }),
    authController.refresh
);

export default authRoutes;
