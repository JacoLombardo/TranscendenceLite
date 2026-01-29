import { ChatMessage } from "../../types/chat.js";
import { query } from "../db_init.js";

// Create a new message row in the messages table of the database
export async function addMessageDB(msg: ChatMessage): Promise<void> {
	const result = await query(
		`
        INSERT INTO messages (id, sender, receiver, type, game_id, content, sent_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
		[msg.id, msg.sender, msg.receiver, msg.type, msg.gameId, msg.content, msg.sentAt]
	);

	if (result.rowCount === 0) throw new Error(`[DB] Failed to add message of type ${msg.type} to database`);
	else console.log(`[DB] Added message of type ${msg.type} to database`);
}

export async function removeTournamentMessages(tournamentId: string): Promise<void> {
	const result = await query("DELETE FROM messages WHERE type = 'tournament' AND game_id = $1", [
		tournamentId,
	]);
	if (result.rowCount === 0)
		throw new Error(`[DB] Failed to remove tournament ${tournamentId} messages`); // If DB run fails, throws error
	else console.log(`[DB] Tournament ${tournamentId} messages removed removed`);
}

// Remove a message from the database
export async function removeMessageDB(id: number): Promise<void> {
	const result = await query("DELETE FROM messages WHERE id = $1", [id]);
	if (result.rowCount === 0) throw new Error(`[DB] Failed to remove message ${id}`); // If DB run fails, throws error
	else console.log(`[DB] Message ${id} removed`);
}
