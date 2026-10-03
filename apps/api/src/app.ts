import express, { type Express, type Request, type Response } from "express";
import { notFoundHandler } from "./middleware/not-found.js";
import { errorHandler } from "./middleware/error-handler.js";
import apiRouter from "./routes/index.js";
import cookieParser from "cookie-parser";

const app: Express = express();

app.use(express.json());
app.use(cookieParser());
app.set("trust proxy", 1);

app.get("/", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
});

app.use("/api", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
export default app;
