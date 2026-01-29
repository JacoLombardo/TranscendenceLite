import { query } from "../db_init.js";
import crypto from "crypto";

// Add (register) a new user to the database
export async function registerUserDB(username: string, hashedPassword: string, avatar: string) {
	const result = await query(
		`
		INSERT INTO users (username, password, avatar, created_at)
		VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
	`,
		[username, hashedPassword, avatar]
	);
	if (result.rowCount === 0)
		throw new Error(`[DB] Failed to register user ${username}`); // If DB run fails, throws error
	else console.log(`[DB] Registered new user ${username}`);
}

// Update the username column
export async function updateUsernameDB(username: string, newUsername: string) {
	const result = await query(
		`
		UPDATE users
		SET username = $1
		WHERE username = $2
	`,
		[newUsername, username]
	);
	if (result.rowCount === 0)
		throw new Error(`[DB] Failed to update username for user ${username}`); // If DB run fails, throws error
	else console.log(`[DB] Username updated for user ${username}`);
}

// Update the password column
export async function updatePasswordDB(username: string, hashedPassword: string) {
	const result = await query(
		`
		UPDATE users
		SET password = $1
		WHERE username = $2
	`,
		[hashedPassword, username]
	);
	if (result.rowCount === 0)
		throw new Error(`[DB] Failed to update password for user ${username}`); // If DB run fails, throws error
	else console.log(`[DB] Password updated for user ${username}`);
}

// Update the avatar column
export async function updateAvatarDB(username: string, avatar: string) {
	const result = await query(
		`
		UPDATE users
		SET avatar = $1
		WHERE username = $2
	`,
		[avatar, username]
	);
	if (result.rowCount === 0)
		throw new Error(`[DB] Failed to update avatar for user ${username}`); // If DB run fails, throws error
	else console.log(`[DB] Avatar updated for user ${username}`);
}

// Add a friend (ID) to the friends column
export async function addFriendDB(username: string, friend: string) {
	const jsonResult = await query(`SELECT friends FROM users WHERE username = $1`, [username]);
	const json: any = jsonResult.rows[0];

	// Parse the JSON
	const friends = JSON.parse(json.friends);

	// Avoid duplicates
	if (!friends.includes(friend)) friends.push(friend);

	// Update back into the DB
	const result = await query(`UPDATE users SET friends = $1 WHERE username = $2`, [
		JSON.stringify(friends),
		username,
	]);
	if (result.rowCount === 0)
		throw new Error(`[DB] Failed to add friend ${friend} to user ${username}`); // If DB run fails, throws error
	else console.log(`[DB] Friend ${friend} added to user ${username}`);
}

// Remove friend (ID) from the friends column
export async function removeFriendDB(username: string, friend: string) {
	const jsonResult = await query(`SELECT friends FROM users WHERE username = $1`, [username]);
	const json: any = jsonResult.rows[0];

	// Parse the JSON
	const friends = JSON.parse(json.friends);

	// Remove a friend
	const updatedFriends = friends.filter((f: string) => f !== friend);

	// Update back into the DB
	const result = await query(`UPDATE users SET friends = $1 WHERE username = $2`, [
		JSON.stringify(updatedFriends),
		username,
	]);
	if (result.rowCount === 0)
		throw new Error(`[DB] Failed to remove friend ${friend} from user ${username}`); // If DB run fails, throws error
	else console.log(`[DB] Friend ${friend} removed from user ${username}`);
}

// Add an user (ID) to the blocked column
export async function blockUserDB(username: string, enemy: string) {
	const jsonResult = await query(`SELECT blocked FROM users WHERE username = $1`, [username]);
	const json: any = jsonResult.rows[0];

	// Parse the JSON
	const blocked = JSON.parse(json.blocked);

	// Avoid duplicates
	if (!blocked.includes(enemy)) blocked.push(enemy);

	// Update back into the DB
	const result = await query(`UPDATE users SET blocked = $1 WHERE username = $2`, [
		JSON.stringify(blocked),
		username,
	]);
	if (result.rowCount === 0)
		throw new Error(`[DB] Failed to block ${enemy} for user ${username}`); // If DB run fails, throws error
	else console.log(`[DB] User ${enemy} blocked for user ${username}`);
}

// Remove an user (ID) from the blocked column
export async function unblockUserDB(username: string, enemy: string) {
	const jsonResult = await query(`SELECT blocked FROM users WHERE username = $1`, [username]);
	const json: any = jsonResult.rows[0];

	// Parse the JSON
	const blocked = JSON.parse(json.blocked);

	// Remove a friend
	const updatedBlocked = blocked.filter((f: string) => f !== enemy);

	// Update back into the DB
	const result = await query(`UPDATE users SET blocked = $1 WHERE username = $2`, [
		JSON.stringify(updatedBlocked),
		username,
	]);
	if (result.rowCount === 0)
		throw new Error(`[DB] Failed to unblock ${enemy} for user ${username}`); // If DB run fails, throws error
	else console.log(`[DB] User ${enemy} unblocked for user ${username}`);
}

export async function updateStatsDB(username: string, stats: string) {
	const result = await query(
		`
		UPDATE users
		SET stats = $1
		WHERE username = $2
	`,
		[stats, username]
	);
	if (result.rowCount === 0)
		throw new Error(`[DB] Failed to update stats for user ${username}`); // If DB run fails, throws error
	else console.log(`[DB] Stats updated for user ${username}`);
}

// Remove an user from the database
export async function removeUserDB(username: string): Promise<void> {
	await query("DELETE FROM users WHERE username = $1", [username]);
}

//OAUTH
// Insert a new GitHub OAuth user into the database
export async function registerGithubUserDB(username: string, providerId: string, avatar?: string) {
	// placeholder password is ignored for OAuth users
	const placeholderPassword = crypto.randomBytes(32).toString("hex");

	const result = await query(
		`
		INSERT INTO users (username, password, provider, provider_id, avatar, created_at)
		VALUES ($1, $2, 'github', $3, $4, CURRENT_TIMESTAMP)
	`,
		[username, placeholderPassword, providerId, avatar]
	);

	if (result.rowCount === 0) throw new Error(`[DB] Failed to register GitHub user ${username}`);
	else console.log(`[DB] Registered new GitHub user ${username}`);
}
