import app from "./app.js";
import { env } from "./config/env.js";

const PORT = env.PORT;
app.listen(PORT, "0.0.0.0", (error) => {
    if (error) {
        throw error;
    }
    console.log(`Express app listening on port ${PORT}!`);
});
