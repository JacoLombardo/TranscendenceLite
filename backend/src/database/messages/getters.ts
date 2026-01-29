import { query } from "../db_init.js";

// Retrieve all messages from the database
export async function getAllMessagesDB(): Promise<any[]> {
	const result = await query(
		`
        SELECT *
        FROM messages
        ORDER BY sent_at ASC
    `
	);
	return result.rows;
}

// Retrieve all global messages (with receiver null)
export async function getAllGlobalMessagesDB(): Promise<any[]> {
	const result = await query(
		`
        SELECT *
        FROM messages
        WHERE type = $1
        ORDER BY sent_at ASC
    `,
		["broadcast"]
	);
	return result.rows;
}

// Retrieve the messages where the user is either the sender (and the receiver is not null) or the receiver
export async function getPrivateUserMessagesDB(username: string): Promise<any[]> {
	const result = await query(
		`
        SELECT *
        FROM messages
        WHERE (sender = $1 OR receiver = $1) 
          AND receiver IS NOT NULL
        ORDER BY sent_at ASC
    `,
		[username]
	);
	return result.rows;
}

// Retrieve the messages where the user is the sender
export async function getUserAsSenderMessagesDB(username: string): Promise<any[]> {
	const result = await query(
		`
        SELECT *
        FROM messages
        WHERE sender = $1
        ORDER BY sent_at ASC
    `,
		[username]
	);
	return result.rows;
}

// Retrieve the messages where the user is the receiver
export async function getUserAsReceiverMessagesDB(username: string): Promise<any[]> {
	const result = await query(
		`
        SELECT *
        FROM messages
        WHERE receiver = $1
        ORDER BY sent_at ASC
    `,
		[username]
	);
	return result.rows;
}

// Check if the user is part of a tournament group chat and return the id of that tournament if yes
export async function checkIfTournamentMessagesDB(username: string): Promise<string | undefined> {
	const result = await query(
		`
        SELECT *
        FROM messages
        WHERE type = $1 AND (sender = $2 OR receiver = $2)
        ORDER BY sent_at ASC
    `,
		["tournament", username]
	);
	const messages: any = result.rows;
	if (messages.length === 0) return undefined;
	else {
		let gameId = undefined;
		for (const message of messages) {
			if (gameId && message.game_id != gameId)
				throw new Error(`[DB] Messages for multiple tournaments for ${username}`);
			gameId = message.game_id;
		}
		return gameId;
	}
}

export async function getTournamentMessagesDB(tournamentId: string): Promise<any[]> {
	const result = await query(
		`
        SELECT *
        FROM messages
        WHERE type = $1 AND game_id = $2
        ORDER BY sent_at ASC
    `,
		["tournament", tournamentId]
	);
	return result.rows;
}
