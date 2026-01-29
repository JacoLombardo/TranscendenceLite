import { query } from "../db_init.js";

export async function createTournamentDB(
	id: string,
	name: string,
	size: number,
	creator?: string
): Promise<void> {
	const result = await query(
		`
		INSERT INTO tournaments (id, name, size, creator)
		VALUES ($1, $2, $3, $4)
	`,
		[id, name, size, creator || null]
	);
	if (result.rowCount === 0) throw new Error(`[DB] Failed to create tournament ${id}`); // If DB run fails, throws error
	else console.log(`[DB] Created new tournament ${id} named ${name} with size ${size}`);
}

export async function startTournamentDB(id: string): Promise<void> {
	const result = await query(
		`
		UPDATE tournaments
		SET started_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`,
		[id]
	);

	if (result.rowCount === 0) throw new Error(`[DB] Failed to start tournament ${id}`); // If DB run fails, throws error
	else console.log(`[DB] Started new tournament ${id}`);
}

export async function endTournamentDB(id: string, winner?: string): Promise<void> {
	const result = await query(
		`
		UPDATE tournaments
		SET winner = $1, ended_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`,
		[winner, id]
	);
	if (result.rowCount === 0) throw new Error(`[DB] Failed to end tournament ${id}`); // If DB run fails, throws error
	else console.log(`[DB] Tournament ${id} ended: ${winner ?? "null"}`);
}

export async function forfeitTournamentDB(id: string, playerId: string) {
	const result = await query(
		`
		UPDATE tournaments
		SET notes = $1, ended_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`,
		[`Tournament forfeited: player ${playerId} left`, id]
	);
	if (result.rowCount === 0) throw new Error(`[DB] Failed to forfeit match ${id}`); // If DB run fails, throws error
	else console.log(`[DB] Tournament ${id} forfeited: player ${playerId} left`);
}

export async function removeTournamentDB(id: string): Promise<void> {
	await query("DELETE FROM tournaments WHERE id = $1", [id]);
}

//  added this function to clean up abandoned tournaments
/*
tournaments are deleted if ALL of these conditions are true:
- start_at is NULL, meaning they never reached 4 players
- created_at is more than 3 minutes ago
 */
export async function cleanupAbandonedTournamentsDB(minutesOld: number = 3): Promise<number> {
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
	return deletedCount;
}
