// Enable remote authentication with GitHub

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import crypto from "node:crypto";
import { createSessionToken, isSecureContext, makeSessionCookie } from "../auth/session.js";
import { getGithubUserByProviderIdDB, isUsernameDB } from "../database/users/getters.js";
import { registerGithubUserDB } from "../database/users/setters.js";
import { readCookie, setStateCookie } from "../auth/oauth.js";
import fs from "fs";

// OAuth config: env vars (Fly, Vercel, etc.) or file-based secrets (Docker/Kubernetes)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;
function readSecretFile(path: string): string | undefined {
	try {
		const value = fs.readFileSync(path, "utf8").trim();
		return value.length > 0 ? value : undefined;
	} catch {
		return undefined;
	}
}

const GITHUB_CLIENT_ID =
	process.env.GITHUB_CLIENT_ID ?? readSecretFile("/run/secrets/github_client_id");
const GITHUB_CLIENT_SECRET =
	process.env.GITHUB_CLIENT_SECRET ?? readSecretFile("/run/secrets/github_client_secret");
export default async function oauthRoutes(fastify: FastifyInstance) {
	function getRedirectUri(request: FastifyRequest): string {
		const envUri = process.env.GITHUB_REDIRECT_URI?.trim();
		if (envUri) return envUri;
		const proto = request.headers["x-forwarded-proto"] === "https" ? "https" : (request.protocol || "http");
		const host = request.headers.host || "";
		// Default matches common GitHub OAuth callback path
		return host ? `${proto}://${host}/api/oauth/callback` : "";
	}

	fastify.get("/api/auth/github/start", async (request, reply) => {
		if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
			return reply.code(500).send({ success: false, message: "GitHub OAuth not configured" });
		}

		const redirectUri = getRedirectUri(request);
		if (!redirectUri) {
			return reply.code(500).send({ success: false, message: "GITHUB_REDIRECT_URI or Host header required" });
		}

		const state = crypto.randomUUID();
		setStateCookie(reply, state);

		const url = new URL("https://github.com/login/oauth/authorize");
		url.searchParams.set("client_id", GITHUB_CLIENT_ID);
		url.searchParams.set("redirect_uri", redirectUri);
		url.searchParams.set("scope", "read:user user:email");
		url.searchParams.set("state", state);

		reply.redirect(url.toString());
	});

	// Callback handler (register at both paths for flexibility)
	async function handleCallback(request: FastifyRequest, reply: FastifyReply) {
		const code = (request.query as any)?.code as string | undefined;
		const state = (request.query as any)?.state as string | undefined;

		const expected = readCookie(request.headers.cookie, "oauth_state");
		if (!code || !state || !expected || state !== expected) {
			return reply.code(400).send({ success: false, message: "Invalid OAuth state" });
		}

		const redirectUri = getRedirectUri(request);
		if (!redirectUri) {
			return reply.code(500).send({ success: false, message: "GITHUB_REDIRECT_URI or Host header required" });
		}

		const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				client_id: GITHUB_CLIENT_ID,
				client_secret: GITHUB_CLIENT_SECRET,
				code,
				redirect_uri: redirectUri,
			}),
		});

		const tokenBody = (await tokenRes.json()) as { access_token?: string };
		if (!tokenBody.access_token) {
			console.error("[OAuth] Token exchange failed:", tokenBody);
			return reply.code(400).send({ success: false, message: "OAuth token exchange failed" });
		}

		const profRes = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `Bearer ${tokenBody.access_token}`,
				Accept: "application/vnd.github+json",
				"User-Agent": "ft_transcendence",
			},
		});

		const profile = (await profRes.json()) as {
			id: number;
			login: string;
			avatar_url?: string;
		};

		const providerId = String(profile.id);

		let username = await getGithubUserByProviderIdDB(providerId);

		// create user if not found
		if (!username) {
			let candidate = profile.login;
			if (await isUsernameDB(candidate)) candidate = `${candidate}_${Math.floor(Math.random() * 10000)}`;
			await registerGithubUserDB(candidate, providerId, profile.avatar_url);
			username = candidate;
		}

		const { token, maxAgeSec } = createSessionToken(username, 60);
		const secure = isSecureContext(request) || process.env.NODE_ENV === "production";
		reply.header("Set-Cookie", makeSessionCookie(token, { secure, maxAgeSec }));

		if (!FRONTEND_ORIGIN) {
			return reply.code(500).send({ success: false, message: "FRONTEND_ORIGIN not configured" });
		}
		// Pass token in URL so frontend can store it when third-party cookies are blocked
		const tokenParam = `token=${encodeURIComponent(token)}`;
		reply.redirect(`${FRONTEND_ORIGIN}/#/menu?${tokenParam}`);
	}

	fastify.get("/api/auth/github/callback", handleCallback);
	fastify.get("/api/oauth/callback", handleCallback);
}
