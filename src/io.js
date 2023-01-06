import { Server as SocketIOServer } from "socket.io";
import { createClient as createRedisClient } from "redis";
import { createAdapter as createRedisAdapter } from "@socket.io/redis-adapter";

/**
 *
 * @param {import("http").Server} httpServer
 * @param {Record<string, unknown>} config
 */
export const initializeSocketIO = async (httpServer, config) => {
  try {
    const pubClient = createRedisClient();
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    const redisAdapter = createRedisAdapter(
      pubClient,
      subClient,
      config.redis ?? {}
    );

    const io = new SocketIOServer(httpServer, {
      adapter: redisAdapter,
      ...config.server_options,
    });

    io.on("connection", () => {
      console.info("new connection to the server");
    });
  } catch (error) {
    console.error("Initialisation of SocketIOServer failed:");
    console.error(error);
    process.exit(1);
  }
};
