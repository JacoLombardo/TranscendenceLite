import { Match } from "../../types/match.js";
import { query } from "../db_init.js";

// Create a new match row in the matches table of the database
export async function createMatchDB(match: Match): Promise<void> {
	let result = null;
	if (match.tournament) {
		const { id, round, type, placementRange } = match.tournament;
		result = await query(
			`
			INSERT INTO matches (id, mode, round, tournament_id, in_tournament_type, in_tournament_placement_range)
			VALUES ($1, $2, $3, $4, $5, $6)
		`,
			[match.id, match.mode, round, id, type, JSON.stringify(placementRange)]
		);
	} else {
		result = await query(
			`
			INSERT INTO matches (id, mode, round, tournament_id, in_tournament_type, in_tournament_placement_range)
			VALUES ($1, $2, $3, $4, $5, $6)
		`,
			[match.id, match.mode, 0, null, null, null]
		);
	}

	if (result.rowCount === 0)
		throw new Error(`[DB] Failed to create match ${match.id}`); // If DB run fails, throws error
	else {
		if (match.tournament)
			console.log(
				`[DB] Created new match ${match.id} for round ${match.tournament.round} of tournament ${match.tournament.id}`
			);
		else console.log(`[DB] Created new match ${match.id} for single game`);
	}
}

// Add a player (left or right) to the match
export async function addPlayerMatchDB(id: string, playerId: string, side: string): Promise<void> {
	let result = null;
	if (side === "left") {
		result = await query(
			`
			UPDATE matches
			SET player_left = $1
			WHERE id = $2
		`,
			[playerId, id]
		);
	} else {
		result = await query(
			`
			UPDATE matches
			SET player_right = $1
			WHERE id = $2
		`,
			[playerId, id]
		);
	}
	if (result.rowCount === 0)
		throw new Error(`[DB] Failed to add ${side} player to match ${id}`); // If DB run fails, throws error
	else console.log(`[DB] Added ${side} player for match ${id}`);
}

// Start the match
export async function startMatchDB(id: string, tournamentId?: string): Promise<void> {
	const result = await query(
		`
		UPDATE matches
		SET started_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`,
		[id]
	);

	if (result.rowCount === 0) throw new Error(`[DB] Failed to start match ${id}`); // If DB run fails, throws error
	else {
		if (tournamentId) console.log(`[DB] Started new match ${id} for tournament ${tournamentId}`);
		else console.log(`[DB] Started new match ${id} for single game`);
	}
}

// Update the match score
export async function updateMatchDB(id: string, left: number, right: number): Promise<void> {
	const result = await query(
		`
		UPDATE matches
		SET score_left = $1, score_right = $2
		WHERE id = $3
	`,
		[left, right, id]
	);

	if (result.rowCount === 0) throw new Error(`[DB] Failed to update match ${id}`); // If DB run fails, throws error
	else console.log(`[DB] Match ${id} updated: ${left}-${right}`);
}

// End the match and set the winner
export async function endMatchDB(match: Match): Promise<void> {
	const { id } = match;
	const { winner } = match.state;
	const notes = match.mode === "local" && winner === "right" ? "The winner is the guest" : null;
	const result = await query(
		`
		UPDATE matches
		SET winner = $1, notes = $2, ended_at = CURRENT_TIMESTAMP
		WHERE id = $3
	`,
		[winner, notes, id]
	);

	if (result.rowCount === 0) throw new Error(`[DB] Failed to end match ${id}`); // If DB run fails, throws error
	else console.log(`[DB] Match ${id} ended: winner is ${winner}`);
}

export async function forfeitMatchDB(id: string, playerId: string) {
	const result = await query(
		`
		UPDATE matches
		SET notes = $1, ended_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`,
		[`Match forfeited: player ${playerId} left`, id]
	);
	if (result.rowCount === 0) throw new Error(`[DB] Failed to forfeit match ${id}`); // If DB run fails, throws error
	else console.log(`[DB] Match ${id} forfeited: player ${playerId} left`);
}

//  Remove a player from an online match (used when player leaves during waiting mode)
export async function removePlayerFromMatchDB(
	id: string,
	playerId: string,
	side: "left" | "right"
): Promise<void> {
	const column = side === "left" ? "player_left" : "player_right";
	const result = await query(
		`
		UPDATE matches
		SET ${column} = NULL
		WHERE id = $1
	`,
		[id]
	);
	if (result.rowCount === 0) throw new Error(`[DB] Failed to remove ${side} player from match ${id}`);
	else console.log(`[DB] Removed ${side} player ${playerId} from match ${id}`);
}

// Remove a match from the database
export async function removeMatchDB(id: string): Promise<void> {
	const result = await query("DELETE FROM matches WHERE id = $1", [id]);
	if (result.rowCount === 0) throw new Error(`[DB] Failed to remove match ${id}`); // If DB run fails, throws error
	else console.log(`[DB] Match ${id} removed`);
}

