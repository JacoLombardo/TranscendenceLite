// Main entry point that starts the backend server
import "dotenv/config"; // loads backend/.env at startup
import { initDatabase } from "./database/db_init.js";
import fastify from "./server.js";
import cors from "@fastify/cors";

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? "0.0.0.0";
// USER_MANAGEMENT
// enable credentials so browsers can send/receive cookies (required for session cookie)
await fastify.register(cors, { origin: true, credentials: true });

await initDatabase();
try {
	// starts the server
	const address = await fastify.listen({ port: PORT, host: HOST });
	// logs the address and origin
	console.log(`[backend] listening on ${address}`);
	console.log(`[backend] allowing CORS from any origin`);
} catch (err) {
	fastify.log.error(err);
	process.exit(1);
}
