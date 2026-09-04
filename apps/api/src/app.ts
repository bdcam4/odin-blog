import express, { type Express, type Request, type Response } from "express";
import { notFoundHandler } from "./middleware/not-found.js";
import { errorHandler } from "./middleware/error-handler.js";
import apiRouter from "./routes/index.js";

const app: Express = express();

app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
});

app.use("/api", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
export default app;
