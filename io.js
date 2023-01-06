import { Server as SocketIOServer } from "socket.io";
import { createClient as createRedisClient } from "redis";
import { createAdapter as createRedisAdapter } from "@socket.io/redis-adapter";

/**
 *
 * @param {http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>} httpServer
 * @param {Record<string, unknown>} config
 */
export const initializeSocketIO = async (httpServer, config) => {
  const io = new SocketIOServer(httpServer, config.server_options);

  const pubClient = createRedisClient();
  const subClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect()]);

  io.adapter(createRedisAdapter(pubClient, subClient, config.redis));

  io.on("connection", () => {
    console.log("new connection to the server");
  });
};
