import { query } from "../db_init.js";

// Retrieve all matches from the database
export async function getAllMatchesDB(): Promise<any[]> {
	const result = await query(
		`
		SELECT *
		FROM matches
		ORDER BY internal_id ASC
	`
	);
	return result.rows;
}

// Retrieve all single games where an user played
export async function getAllSGMatchesByUserDB(username: string): Promise<any[]> {
	const result = await query(
		`
		SELECT *
		FROM matches
		WHERE tournament_id IS NULL
		AND (player_left = $1 OR player_right = $1);
	`,
		[username]
	);
	return result.rows;
}

// Retrieve the desired match from the database (if present) and return it as json
export async function getMatchByIdDB(id: string) {
	const result = await query(
		`
		SELECT *
		FROM matches
		WHERE id = $1
	`,
		[id]
	);
	const row = result.rows[0];
	if (!row) throw new Error(`[DB] Match ${id} not found`);
	return row;
}
