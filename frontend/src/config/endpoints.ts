// Allow env overrides for hosted deployments.
const envApiBase = (import.meta as any).env?.VITE_API_BASE as string | undefined;
const envWsBase = (import.meta as any).env?.VITE_WS_BASE as string | undefined;

const defaultPort =
	window.location.port !== "" ? Number(window.location.port) : window.location.protocol === "https:" ? 443 : 80;

// Default to same-origin for local dev/proxy setups.
const fallbackApiBase = `${window.location.protocol}//${window.location.hostname}${defaultPort ? `:${defaultPort}` : ""}`;
export const API_BASE = envApiBase ?? fallbackApiBase;

// WebSocket base defaults to API base.
const wsBase = envWsBase ?? API_BASE;
const wsBaseUrl = new URL(wsBase);

const wsHostOverride = new URLSearchParams(window.location.search).get("wsHost");
const wsPortOverride = new URLSearchParams(window.location.search).get("wsPort");

// Infer WS protocol from base URL (supports https -> wss).
export const WS_PROTOCOL = wsBaseUrl.protocol === "https:" || wsBaseUrl.protocol === "wss:" ? "wss" : "ws";
// Allow query overrides for manual testing.
export const WS_HOST = wsHostOverride ?? wsBaseUrl.hostname;

const wsPortFromBase =
	wsBaseUrl.port !== ""
		? Number(wsBaseUrl.port)
		: wsBaseUrl.protocol === "https:" || wsBaseUrl.protocol === "wss:"
		? 443
		: 80;

// Allow query overrides for manual testing.
export const WS_PORT = Number(wsPortOverride ?? wsPortFromBase);

function getHashQueryParam(key: string): string | null {
	const hash = window.location.hash || "";
	const query = hash.includes("?") ? hash.split("?").slice(1).join("?") : "";
	return new URLSearchParams(query).get(key);
}

// Used as a fallback by parts of the app that don't thread the id through explicitly.
// Most game views pass `id` via `#/game?...`.
export const ROOM_ID = getHashQueryParam("id") ?? new URLSearchParams(window.location.search).get("id") ?? "local";
