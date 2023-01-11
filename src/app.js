import http from "http";
import { readConfig } from "./readConfig.js";
import { indexPageHandler } from "./indexPageHandler.js";
import { initializeSocketIO } from "./io.js";

const config = await readConfig();

const PORT = process.env.PORT || 3000;

const httpServer = http.createServer({}, indexPageHandler);

await initializeSocketIO(httpServer, config);

httpServer.listen(PORT, () =>
  console.info(`Server listening on port http://localhost:${PORT}`)
);
