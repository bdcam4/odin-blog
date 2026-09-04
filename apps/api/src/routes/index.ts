import { Router } from "express";
import postRoutes from "./post.routes.js";

// Central mount point: every resource router attaches here, then the
// assembled /api router is mounted once in app.ts.
const apiRouter = Router();

apiRouter.use("/posts", postRoutes);

export default apiRouter;
