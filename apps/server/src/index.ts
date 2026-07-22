import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import fastify, { type FastifyInstance } from "fastify";
import { appRouter, buildLogEmitter, type BuildLogEvent } from "./router.js";

interface BuildLogSocket {
  send(message: string): void;
  on(event: "close", listener: () => void): void;
}

export interface StartServerOptions {
  readonly host?: string;
  readonly port?: number;
  readonly logger?: boolean;
}

export interface StartedServer {
  readonly server: FastifyInstance;
  readonly host: string;
  readonly port: number;
  readonly url: string;
  close(): Promise<void>;
}

export async function createServer(logger = true): Promise<FastifyInstance> {
  const server = fastify({ logger });

  await server.register(cors, {
    origin: true,
  });

  await server.register(websocket);

  await server.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: { router: appRouter },
  });

  server.get("/health", () => ({ ok: true }));

  server.get("/ws/build", { websocket: true }, (connection: BuildLogSocket) => {
    const sendLog = (event: BuildLogEvent): void => {
      connection.send(JSON.stringify(event));
    };

    buildLogEmitter.on("build-log", sendLog);
    connection.on("close", () => {
      buildLogEmitter.off("build-log", sendLog);
    });
  });

  return server;
}

export async function startServer(options: StartServerOptions = {}): Promise<StartedServer> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 3001;
  const server = await createServer(options.logger ?? true);
  await server.listen({ host, port });
  const address = server.server.address();
  const resolvedPort = typeof address === "object" && address !== null ? address.port : port;
  return {
    server,
    host,
    port: resolvedPort,
    url: `http://${host}:${String(resolvedPort)}`,
    close: async () => {
      await server.close();
    },
  };
}

function envPort(): number {
  const parsed = Number.parseInt(process.env.PORT ?? "3001", 10);
  return Number.isFinite(parsed) ? parsed : 3001;
}

const isCliEntry = process.argv[1] !== undefined && import.meta.url === new URL(process.argv[1], "file:").href;

if (isCliEntry) {
  await startServer({
    host: process.env.HOST ?? "127.0.0.1",
    port: envPort(),
    logger: true,
  });
}
