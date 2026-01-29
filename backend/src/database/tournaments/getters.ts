import { query } from "../db_init.js";

// Retrieve all tournaments from the database
export async function getAllTournamentsDB(): Promise<any[]> {
	const result = await query(
		`
		SELECT *
		FROM tournaments
		ORDER BY internal_id ASC
	`
	);
	return result.rows;
}

// Retrieve open tournaments from the database
export async function getOpenTournamentsDB(): Promise<Array<{ id: string; name: string; size: number }>> {
	const result = await query(
		`
		SELECT id, name, size
		FROM tournaments
		WHERE started_at IS NULL
		ORDER BY internal_id ASC
	`
	);
	return result.rows as Array<{ id: string; name: string; size: number }>;
}

// Retrive all the tournaments where a specific user played
export async function getTournamentsByUserDB(username: string) {
	const result = await query(
		`
        SELECT 
            t.id AS tournament_id,
            t.name,
            t.winner,
            t.created_at,
            t.notes,

            m.id AS match_id,
            m.player_left,
            m.player_right,
            m.score_left,
            m.score_right,
            m.round,
            m.winner AS match_winner,
            m.started_at AS match_started_at,
            m.in_tournament_placement_range,
            m.ended_at AS match_ended_at
        FROM tournaments t
        LEFT JOIN matches m 
            ON m.tournament_id = t.id 
            AND (m.player_left = $1 OR m.player_right = $1)
        WHERE t.id IN (
            SELECT tournament_id 
            FROM tournament_players 
            WHERE username = $1
        )
        -- Order tournaments by newest date
        -- Order matches by ROUND DESCENDING (Highest round/Final first)
        ORDER BY t.created_at DESC, m.round DESC, m.id DESC;
    `,
		[username]
	);

	const rows: any = result.rows;

	const tournaments: any[] = [];

	for (const row of rows) {
		let tournament = tournaments.find((t) => t.id === row.tournament_id);

		if (!tournament) {
			tournament = {
				id: row.tournament_id,
				name: row.name,
				winner: row.winner,
				created_at: row.created_at,
				notes: row.notes,
				matches: [],
			};
			tournaments.push(tournament);
		}

		if (row.match_id) {
			tournament.matches.push({
				id: row.match_id,
				player_left: row.player_left,
				player_right: row.player_right,
				score_left: row.score_left,
				score_right: row.score_right,
				round: row.round,
				winner: row.match_winner,
				placement_range: row.in_tournament_placement_range,
				started_at: row.match_started_at,
				ended_at: row.match_ended_at,
			});
		}
	}

	return tournaments;
}

// Retrieve the desired tournament from the database (if present) and return it as json
export async function getTournamentByIdDB(id: string): Promise<any> {
	const result = await query(
		`
		SELECT *
		FROM tournaments
		WHERE id = $1
	`,
		[id]
	);
	const row = result.rows[0];
	if (!row) throw new Error(`[DB] Tournament ${id} not found`);
	return row;
}

export async function getTournamentCountByCreator(creator: string): Promise<number> {
	const result = await query(
		`
		SELECT COUNT(*) as count
		FROM tournaments
		WHERE creator = $1
	`,
		[creator]
	);
	return Number(result.rows[0]?.count || 0);
}
