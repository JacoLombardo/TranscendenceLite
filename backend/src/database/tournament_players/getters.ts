import { query } from "../db_init.js";

// Retrieve all tournament players from the database
export async function getAllTournamentPlayersDB(): Promise<any[]> {
	const result = await query(
		`
		SELECT *
		FROM tournament_players
		ORDER BY tournament_id ASC
	`
	);
	return result.rows;
}

// Retrieve all the players of a specific tournament (returns username and display_name)
export async function getAllPlayersForTournamentDB(tournamentId: string) {
	const result = await query(
		`
		SELECT username, display_name
		FROM tournament_players
		WHERE tournament_id = $1
		ORDER BY username ASC
	`,
		[tournamentId]
	);

	if (result.rows.length === 0) throw new Error(`[DB] No players found for tournament ${tournamentId}`);

	return result.rows;
}

export async function getAllTournamentsForUserDB(username: string) {
	const result = await query(
		`
		SELECT tournaments.*
		FROM tournaments
		JOIN tournament_players
			ON tournaments.id = tournament_players.tournament_id
		WHERE tournament_players.username = $1
		ORDER BY tournaments.started_at DESC
	`,
		[username]
	);

	if (result.rows.length === 0) throw new Error(`[DB] User ${username} is not in any tournament`);

	return result.rows;
}

export async function getTournamentWithPlayersDB(tournamentId: string) {
	const result = await query(
		`
		SELECT
			tournaments.*,
			tournament_players.username,
			tournament_players.display_name
		FROM tournaments
		LEFT JOIN tournament_players
			ON tournaments.id = tournament_players.tournament_id
		WHERE tournaments.id = $1
	`,
		[tournamentId]
	);

	const rows: any = result.rows;
	if (rows.length === 0) throw new Error(`[DB] Tournament ${tournamentId} not found`);

	// Convert rows into a structured object
	const tournament = {
		id: rows[0].id,
		name: rows[0].name,
		size: rows[0].size,
		winner: rows[0].winner,
		started_at: rows[0].started_at,
		ended_at: rows[0].ended_at,
		notes: rows[0].notes,
		players: rows.map((r: any) => ({
			username: r.username,
			displayName: r.display_name,
		})),
	};

	return tournament;
}

export async function getAllTournamentsWithPlayersDB() {
	const result = await query(
		`
		SELECT
			tournaments.*,
			tournament_players.username,
			tournament_players.display_name
		FROM tournaments
		LEFT JOIN tournament_players
			ON tournaments.id = tournament_players.tournament_id
		ORDER BY tournaments.started_at DESC
	`
	);

	const rows: any[] = result.rows;
	if (rows.length === 0) return [];

	// Group rows by tournament ID
	const tournamentsMap: Record<string, any> = {};

	for (const r of rows) {
		if (!tournamentsMap[r.id]) {
			tournamentsMap[r.id] = {
				id: r.id,
				name: r.name,
				size: r.size,
				winner: r.winner,
				started_at: r.started_at,
				ended_at: r.ended_at,
				notes: r.notes,
				players: [],
			};
		}

		if (r.username) {
			tournamentsMap[r.id].players.push({
				username: r.username,
				displayName: r.display_name,
			});
		}
	}

	// Convert map to array
	return Object.values(tournamentsMap);
}
