import { convertToMessageArray } from "../chat/utils.js";
import {
	checkIfTournamentMessagesDB,
	getAllGlobalMessagesDB,
	getPrivateUserMessagesDB,
	getTournamentMessagesDB,
} from "../database/messages/getters.js";
import { chatHistoryBE } from "../types/chat.js";

export async function buildChatHistory(username: string): Promise<chatHistoryBE> {
	const chatHistory: chatHistoryBE = {
		user: username,
		global: [],
		private: [],
		tournament: [],
	};
	try {
		chatHistory.global = convertToMessageArray(await getAllGlobalMessagesDB());
		chatHistory.private = convertToMessageArray(await getPrivateUserMessagesDB(username));
		const gameId = await checkIfTournamentMessagesDB(username);
		if (gameId) chatHistory.tournament = convertToMessageArray(await getTournamentMessagesDB(gameId));
	} catch (error: any) {
		console.log(error.message);
	}
	return chatHistory;
}
