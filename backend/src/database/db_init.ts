import { Pool } from "pg";
import type { QueryResultRow } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error("[DB] DATABASE_URL is required for Postgres");
}

const shouldUseSsl =
	process.env.PGSSLMODE === "require" || /sslmode=require/i.test(connectionString);

export const pool = new Pool({
	connectionString,
	ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
});

export function query<T extends QueryResultRow = any>(text: string, params: any[] = []) {
	return pool.query<T>(text, params);
}

async function createSchema() {
	await query(`
		CREATE TABLE IF NOT EXISTS users (
			internal_id SERIAL PRIMARY KEY,
			username TEXT UNIQUE NOT NULL,
			password TEXT NOT NULL,
			provider TEXT DEFAULT 'local',
			provider_id TEXT DEFAULT NULL,
			avatar TEXT,
			friends TEXT DEFAULT '[]',
			blocked TEXT DEFAULT '[]',
			stats TEXT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
	`);

	await query(`
		CREATE TABLE IF NOT EXISTS tournaments (
			internal_id SERIAL PRIMARY KEY,
			id TEXT UNIQUE NOT NULL,
			name TEXT NOT NULL,
			size INTEGER,
			winner TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			started_at TIMESTAMP,
			ended_at TIMESTAMP,
			notes TEXT,
			creator TEXT,

			FOREIGN KEY (winner) REFERENCES users (username)
		);
	`);

	await query(`
		CREATE TABLE IF NOT EXISTS tournament_players (
			tournament_id TEXT NOT NULL,
			username TEXT NOT NULL,
			display_name TEXT NOT NULL,

			PRIMARY KEY (tournament_id, username),

			FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
			FOREIGN KEY (username) REFERENCES users(username)
		);
	`);

	await query(`
		CREATE TABLE IF NOT EXISTS matches (
			internal_id SERIAL PRIMARY KEY,
			id TEXT UNIQUE NOT NULL,
			mode TEXT,
			player_left TEXT,
			player_right TEXT,
			tournament_id TEXT,
			round INTEGER,
			in_tournament_type TEXT,
			in_tournament_placement_range TEXT,
			score_left INTEGER DEFAULT 0,
			score_right INTEGER DEFAULT 0,
			winner TEXT,
			started_at TIMESTAMP,
			ended_at TIMESTAMP,
			notes TEXT,

			FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE CASCADE,
			FOREIGN KEY (player_left) REFERENCES users (username),
			FOREIGN KEY (player_right) REFERENCES users (username)
		);
	`);

	await query(`
		CREATE TABLE IF NOT EXISTS messages (
			internal_id SERIAL PRIMARY KEY,
			id TEXT UNIQUE NOT NULL,
			sender TEXT NOT NULL,
			receiver TEXT,
			type TEXT NOT NULL,
			content TEXT,
			game_id TEXT,
			sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		
			FOREIGN KEY (sender) REFERENCES users(username),
			FOREIGN KEY (receiver) REFERENCES users(username)
		);
	`);
}

async function cleanupIncompleteGames() {
	try {
		const deletedMatches = await query(`DELETE FROM matches WHERE winner IS NULL AND notes IS NULL`);
		const deletedTournaments = await query(`DELETE FROM tournaments WHERE winner IS NULL AND notes IS NULL`);
		const deletedMatchCount = deletedMatches.rowCount ?? 0;
		const deletedTournamentCount = deletedTournaments.rowCount ?? 0;
		console.log(
			`[DB] Cleanup complete — removed ${deletedMatchCount} unfinished matches and ${deletedTournamentCount} unfinished tournaments.`
		);
	} catch (error: any) {
		console.error("[DB] Cleanup failed:", error.message);
	}
}

async function cleanupAbandonedTournaments() {
	try {
		const minutesOld = 3;
		const result = await query(
			`
			DELETE FROM tournaments
			WHERE started_at IS NULL
			AND created_at < NOW() - ($1 * INTERVAL '1 minute')
		`,
			[minutesOld]
		);
		const deletedCount = result.rowCount ?? 0;
		if (deletedCount > 0) {
			console.log(`[DB] Cleaned up ${deletedCount} abandoned tournament(s) older than ${minutesOld} minutes`);
		}
	} catch (error) {
		console.error("[DB] Error cleaning up abandoned tournaments:", error);
	}
}

export async function initDatabase() {
	await createSchema();
	await cleanupIncompleteGames();
	await cleanupAbandonedTournaments();
}
