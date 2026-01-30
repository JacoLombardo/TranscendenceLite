// USER_MANAGEMENT
// Creates a small token that proves a user is logged in, stored in an httpOnly cookie named "sid".
// The token is signed with a secret (HMAC) so it cannot be forged.
// Provided helpers:
// - createSessionToken(userId, ttlMinutes) -> makes a signed token string that is send to the browser.
// - verifySessionToken(token) -> checks the token and returns { userId, exp } if valid, otherwise null.
// - makeSessionCookie(token, options) -> builds a safe Set-Cookie header value for the response.

import crypto from "node:crypto";
import { SessionPayload } from "../types/user.js";
import { FastifyReply, FastifyRequest } from "fastify";

// True when the request is over HTTPS (direct or via proxy like Fly). Used so we set
// Secure + SameSite=None for cookies even when NODE_ENV is not set on Fly.
export function isSecureContext(request?: FastifyRequest): boolean {
	if (!request?.headers) return false;
	const proto = request.headers["x-forwarded-proto"];
	return proto === "https" || request.protocol === "https";
}

// Secret key used to sign tokens. //! TODO: In prod set SESSION_SECRET in env.
// In development, a default value is used so things work locally.
const SESSION_SECRET =
	process.env.SESSION_SECRET || "dev-session-secret-change-me";
if (!process.env.SESSION_SECRET) {
	console.log("[AUTH] SESSION_SECRET not set in env, using default (OK for dev only)");
}

// Convert bytes to base64-url format
// Used to make the token compact and safe to put in a cookie.
function base64url(input: Buffer | string): string {
	const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
	return buf
		.toString("base64")
		.replace(/=/g, "")
		.replace(/\+/g, "-")
		.replace(/\//g, "_");
}

// Create an HMAC-SHA256 signature of the data using the secret.
// Prevents attackers from changing the token without detection.
function hmacSHA256(data: string, key: string): string {
	const mac = crypto.createHmac("sha256", key).update(data).digest();
	return base64url(mac);
}

// Create a new session token for a user.
// - userId: the user who just logged in
// - ttlMinutes: how long the session should last (default 60 minutes)
// Returns: a token string and the maxAge in seconds (handy for cookie TTL)
export function createSessionToken(
	username: string,
	ttlMinutes: number = 60
): { token: string; maxAgeSec: number } {
	const nowSec = Math.floor(Date.now() / 1000);
	const exp = nowSec + Math.floor(ttlMinutes * 60);
	const payload: SessionPayload = { username, exp };
	const payloadJson = JSON.stringify(payload);
	const payloadB64 = base64url(payloadJson);
	const sig = hmacSHA256(payloadB64, SESSION_SECRET);
	const token = `${payloadB64}.${sig}`;
	return { token, maxAgeSec: exp - nowSec };
}

// Check if a token is valid and not expired.
// - token: the token string from the cookie
// Returns: the decoded payload (with userId) or null if invalid/expired
export function verifySessionToken(
	token: string | undefined
): SessionPayload | null {
	if (!token || typeof token !== "string") {
		console.log("[AUTH] verifySessionToken: no token or not a string");
		return null;
	}
	const dot = token.lastIndexOf(".");
	if (dot === -1) {
		console.log("[AUTH] verifySessionToken: token has no dot (invalid format)");
		return null;
	}
	const payloadB64 = token.slice(0, dot);
	const sig = token.slice(dot + 1);
	const expected = hmacSHA256(payloadB64, SESSION_SECRET);
	const sigBuf = Buffer.from(sig);
	const expectedBuf = Buffer.from(expected);
	if (sigBuf.length !== expectedBuf.length) {
		console.log(
			"[AUTH] verifySessionToken: signature length mismatch (possible wrong SESSION_SECRET or corrupted token)"
		);
		return null;
	}
	if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) {
		console.log(
			"[AUTH] verifySessionToken: signature invalid (wrong SESSION_SECRET or token tampered)"
		);
		return null;
	}
	try {
		const json = Buffer.from(
			payloadB64.replace(/-/g, "+").replace(/_/g, "/"),
			"base64"
		).toString("utf8");
		const payload = JSON.parse(json) as SessionPayload;
		const nowSec = Math.floor(Date.now() / 1000);
		if (!payload?.username || typeof payload.exp !== "number") {
			console.log("[AUTH] verifySessionToken: payload missing username or exp");
			return null;
		}
		if (payload.exp <= nowSec) {
			console.log(
				`[AUTH] verifySessionToken: token expired (exp=${payload.exp} now=${nowSec})`
			);
			return null;
		}
		return payload;
	} catch (e) {
		console.log("[AUTH] verifySessionToken: decode/parse failed", String(e));
		return null;
	}
}

// Parse the Cookie header string into a simple object.
// Example: "a=1; sid=XYZ" -> { a: "1", sid: "XYZ" }
export function parseCookies(
	header: string | undefined
): Record<string, string> {
	const out: Record<string, string> = {};
	if (!header) return out;
	const parts = header.split(";");
	for (const part of parts) {
		const idx = part.indexOf("=");
		if (idx === -1) continue;
		const k = part.slice(0, idx).trim();
		const v = decodeURIComponent(part.slice(idx + 1).trim());
		if (k) out[k] = v;
	}
	return out;
}

// Build the Set-Cookie string for the session cookie.
// - token: the session token to store
// - options.secure: set to true only on HTTPS (production)
// - options.maxAgeSec: tells the browser when to expire the cookie
// In production (secure), use SameSite=None so the cookie is sent on cross-origin
// requests (e.g. frontend on Vercel, backend on Fly). SameSite=None requires Secure.
export function makeSessionCookie(
	token: string,
	options?: { secure?: boolean; maxAgeSec?: number }
): string {
	const sameSite = options?.secure ? "SameSite=None" : "SameSite=Lax";
	const attrs: string[] = [
		`sid=${encodeURIComponent(token)}`,
		"Path=/",
		"HttpOnly",
		sameSite,
	];
	if (options?.secure) attrs.push("Secure"); // only over HTTPS
	if (options?.maxAgeSec && options.maxAgeSec > 0)
		attrs.push(`Max-Age=${Math.floor(options.maxAgeSec)}`);
	return attrs.join("; ");
}

export function clearSessionCookie(reply: FastifyReply, request?: FastifyRequest) {
	const secureContext = isSecureContext(request) || process.env.NODE_ENV === "production";
	const sameSite = secureContext ? "SameSite=None" : "SameSite=Lax";
	const secure = secureContext ? "; Secure" : "";
	reply.header(
		"Set-Cookie",
		`sid=; Path=/; HttpOnly; ${sameSite}; Max-Age=0${secure}`
	);
}
