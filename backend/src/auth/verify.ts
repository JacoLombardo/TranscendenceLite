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
	if (!token) return null;
	const payload = verifySessionToken(token);
	if (!payload) {
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
	const token = getTokenFromRequest(request);
	if (!token) {
		clearSessionCookie(reply, request);
		return null;
	}
	const payload = verifySessionToken(token);
	if (!payload) {
		clearSessionCookie(reply, request);
		return null;
	}
	return payload;
}
