import { Router } from "express";
import { apiLimiter } from "../middleware/rate-limit.js";
import postRoutes from "./post.routes.js";
import authRoutes from "./auth.routes.js";

// Central mount point: every resource router attaches here, then the
// assembled /api router is mounted once in app.ts.
const apiRouter = Router();

apiRouter.use(apiLimiter);

apiRouter.use("/auth", authRoutes);

apiRouter.use("/posts", postRoutes);

export default apiRouter;
