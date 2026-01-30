import { FastifyReply, FastifyRequest } from "fastify";
import { clearSessionCookie, parseCookies, verifySessionToken } from "./session.js";

export function authenticateWebSocket(request: any, socket: any) {
	// Token from cookie or from query (WS can't send custom headers from browser easily)
	const cookies = parseCookies(request.headers?.cookie);
	let token: string | undefined = cookies["sid"];
	if (!token && request.url) {
		const url = new URL(request.url, "http://x");
		token = url.searchParams.get("token") ?? undefined;
	}
	if (!token) {
		console.log("[WS] Unauthorized user");
		return null;
	}
	const payload = verifySessionToken(token);
	if (!payload) {
		console.log("[WS] Unauthorized user");
		try {
			socket.close(4401, "Unauthorized");
		} catch {}
		return null;
	}
	return payload;
}

// Get session token from cookie (sid) or Authorization: Bearer <token>.
// Bearer token works when third-party cookies are blocked (e.g. Vercel frontend + Fly backend).
function getTokenFromRequest(request: FastifyRequest): string | undefined {
	const cookies = parseCookies(request.headers.cookie);
	const sid = cookies["sid"];
	if (sid) return sid;
	const auth = request.headers.authorization;
	if (typeof auth === "string" && auth.startsWith("Bearer ")) {
		return auth.slice(7).trim();
	}
	return undefined;
}

export function authenticateRequest(
	request: FastifyRequest,
	reply: FastifyReply
) {
	const cookieHeader = request.headers.cookie;
	const hasCookieHeader = cookieHeader !== undefined && cookieHeader !== "";
	const authHeader = request.headers.authorization;
	const hasBearer = typeof authHeader === "string" && authHeader.startsWith("Bearer ");
	console.log(
		"[AUTH] authenticateRequest: Cookie present?",
		hasCookieHeader,
		"Bearer present?",
		hasBearer
	);

	const token = getTokenFromRequest(request);
	if (!token) {
		clearSessionCookie(reply, request);
		console.log(
			"[AUTH] authenticateRequest: no sid cookie and no Bearer token -> Unauthorized"
		);
		return null;
	}

	// Verify the session token
	const payload = verifySessionToken(token);
	if (!payload) {
		clearSessionCookie(reply, request);
		console.log("[AUTH] authenticateRequest: token verification failed -> Unauthorized");
		return null;
	}
	console.log("[AUTH] authenticateRequest: OK user=", payload.username);
	return payload;
}
