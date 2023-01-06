import http from "http";
import { readConfig } from "./readConfig.js";
import { indexPageHandler } from "./indexPageHandler.js";
import { initializeSocketIO } from "./io.js";

export const config = await readConfig();

const PORT = config.port ?? 3000;

export const httpServer = http.createServer({}, indexPageHandler);

await initializeSocketIO(httpServer);

httpServer.listen(PORT, () =>
  console.log(`Server listening on port http://localhost:${PORT}`)
);
