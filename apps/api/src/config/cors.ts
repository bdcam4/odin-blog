import cors from "cors";
import { env } from "./env.js";

const corsOptions: cors.CorsOptions = {
    origin: env.FRONTEND_ORIGINS,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Authorization", "Content-Type", "X-CSRF-Token"],
    maxAge: 600,
};

export const corsMiddleware = cors(corsOptions);
