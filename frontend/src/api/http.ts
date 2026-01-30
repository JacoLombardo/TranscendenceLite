// http client for fetching game constants from the backend
// Builds the URL from API_BASE and calls /api/constants via fetch(), without cookies (credentials: "omit")
// API_BASE is the base URL for the backend HTTP API e.g. if you open http://localhost:5173/, API_BASE = http://localhost:4000

import { userData } from "../config/constants";
import { API_BASE } from "../config/endpoints";
import type { GameConstants } from "../constants";

const AUTH_TOKEN_KEY = "auth_token";

// Bearer token auth (used when third-party cookies are blocked, e.g. Vercel + Fly).
export function getAuthToken(): string | null {
	return sessionStorage.getItem(AUTH_TOKEN_KEY);
}
export function setAuthToken(token: string | null): void {
	if (token) sessionStorage.setItem(AUTH_TOKEN_KEY, token);
	else sessionStorage.removeItem(AUTH_TOKEN_KEY);
}
export function getAuthHeaders(): Record<string, string> {
	const t = getAuthToken();
	return t ? { Authorization: `Bearer ${t}` } : {};
}

// Fetch gameplay constants for client sizing.
export async function fetchGameConstants(): Promise<GameConstants> {
	const res = await fetch(`${API_BASE}/api/constants`, {
		credentials: "omit",
	});
	if (!res.ok) throw new Error("constants fetch failed");
	const data = await res.json();
	return data as GameConstants;
}

// Check current logged-in user (cookie or Bearer token).
export async function fetchMe(): Promise<{
	id: number;
	username: string;
	avatar: string | null;
	created_at: string;
} | null> {
	const res = await fetch(`${API_BASE}/api/user/me`, {
		credentials: "include",
		headers: { ...getAuthHeaders() },
	});
	if (res.status === 401) return null;
	if (!res.ok) throw new Error("me fetch failed");
	const body = await res.json();
	return body?.data ?? null;
}

// Register a new user (session cookie + token in body for cross-origin).
export async function registerUser(params: { username: string; password: string }): Promise<void> {
	const res = await fetch(`${API_BASE}/api/user/register`, {
		method: "POST",
		headers: { "Content-Type": "application/json", ...getAuthHeaders() },
		credentials: "include",
		body: JSON.stringify(params),
	});
	const text = await res.text();
	if (!res.ok) {
		let message = "register failed";
		try {
			const body = JSON.parse(text);
			message = body?.message || message;
		} catch {}
		throw new Error(message);
	}
	try {
		const body = JSON.parse(text);
		if (body?.token) setAuthToken(body.token);
	} catch {}
}

// Login existing user (session cookie + token in body for cross-origin).
export async function loginUser(params: { username: string; password: string }): Promise<void> {
	const res = await fetch(`${API_BASE}/api/user/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json", ...getAuthHeaders() },
		credentials: "include",
		body: JSON.stringify(params),
	});
	const text = await res.text();
	if (!res.ok) {
		let message = "login failed";
		try {
			const body = JSON.parse(text);
			message = body?.message || message;
		} catch {}
		throw new Error(message);
	}
	try {
		const body = JSON.parse(text);
		if (body?.token) setAuthToken(body.token);
	} catch {}
}

// Logout current user (clears cookie and local token).
export async function logout(params: { username: string }): Promise<void> {
	const res = await fetch(`${API_BASE}/api/user/logout`, {
		method: "POST",
		credentials: "include",
		headers: getAuthHeaders(),
		body: JSON.stringify(params),
	});
	setAuthToken(null);
	userData.userSock?.close();
	userData.gameSock?.close();
	if (!res.ok) throw new Error("logout failed");
}

// Update a single user field (password or avatar).
export async function updateUser(params: {
	username: string;
	newUsername?: string;
	newPassword?: string;
	newAvatar?: string;
}): Promise<void> {
	const res = await fetch(`${API_BASE}/api/user/update`, {
		method: "POST",
		headers: { "Content-Type": "application/json", ...getAuthHeaders() },
		credentials: "include",
		body: JSON.stringify(params),
	});

	const text = await res.text();
	let message = "update failed";

	try {
		const body = JSON.parse(text);
		if (!res.ok || body?.success === false) {
			message = body?.message || message;
			throw new Error(message);
		}
	} catch (err) {
		if (!res.ok) {
			throw new Error(message);
		}
	}
}

// tournament
// Mirrors the backend `/api/tournaments/open` payload:
// includes full tournament state plus a precomputed playersJoined count for the lobby
export type Tournament = {
	id: string;
	name: string;
	state: {
		size: number;
		isRunning: boolean;
		round: number;
		isOver: boolean;
	};
	playersJoined: number;
};

// Fetch open tournaments for lobby list.
export async function fetchTournamentList(): Promise<Tournament[]> {
	const res = await fetch(`${API_BASE}/api/tournaments/open`, {
		credentials: "include",
		headers: getAuthHeaders(),
	});

	if (res.status === 404) {
		return [];
	}

	if (!res.ok) {
		throw new Error("Failed to fetch tournament list");
	}

	const body = await res.json();
	return (body.data as Tournament[]) ?? [];
}

// ============================================================================
// PUBLIC USER PROFILE API
// ============================================================================

// Basic public user info (username, avatar)
export async function fetchUserPublic(username: string) {
	const res = await fetch(`${API_BASE}/api/user/${username}`, {
		credentials: "include",
		headers: getAuthHeaders(),
	});

	if (!res.ok) throw new Error("Failed to fetch user");

	const body = await res.json();
	if (!body.success) throw new Error(body.message || "User not found");

	return body.data; // { username, avatar, ... }
}

// Online status (boolean)
export async function fetchUserOnline(username: string) {
	const res = await fetch(`${API_BASE}/api/user/online/${username}`, {
		credentials: "include",
		headers: getAuthHeaders(),
	});

	if (!res.ok) throw new Error("Failed to fetch online status");

	const body = await res.json();
	return Boolean(body.data); // backend returns actual boolean
}

// Match history for a user
export async function fetchUserMatches(username: string) {
	const res = await fetch(`${API_BASE}/api/user/${username}/matches`, {
		credentials: "include",
		headers: getAuthHeaders(),
	});

	if (!res.ok) throw new Error("Failed to fetch match history");

	const body = await res.json();
	if (!body.success) throw new Error(body.message || "Could not load matches");

	return body.data; // list of matches
}

// Stats (wins, losses, etc)
export async function fetchUserStats(username: string) {
	const res = await fetch(`${API_BASE}/api/user/${username}/stats`, {
		credentials: "include",
		headers: getAuthHeaders(),
	});

	if (!res.ok) throw new Error("Failed to fetch stats");

	const body = await res.json();
	if (!body.success) throw new Error(body.message || "Could not load stats");

	return body.data; // {wins, losses, totalMatches}
}
