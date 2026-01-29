import { query } from "../db_init.js";

// Retrieve all users from the database
export async function getAllUsersDB(): Promise<any[]> {
	const result = await query(
		`
		SELECT *
		FROM users
		ORDER BY internal_id ASC
	`
	);
	if (!result.rows) throw new Error(`[DB] No users found`);
	return result.rows;
}

// Retrieve the desired user from the database (if present) and return it as json
export async function getUserByUsernameDB(username: string): Promise<any> {
	const result = await query(
		`
		SELECT *
		FROM users
		WHERE username = $1
	`,
		[username]
	);
	const row = result.rows[0];
	if (!row) throw new Error(`[DB] User ${username} not found`);
	return row;
}

// Check if the username is already present in the database (if present)
export async function isUsernameDB(username: string): Promise<boolean> {
	const result = await query(
		`
		SELECT 1
		FROM users
		WHERE username = $1
	`,
		[username]
	);
	return (result.rowCount ?? 0) > 0;
}

// Retrieve the frieds of the user
export async function getUserFriendsDB(username: string): Promise<string[]> {
	const result = await query(
		`
		SELECT friends FROM users WHERE username = $1
	`,
		[username]
	);
	const row = result.rows[0];
	if (!row) throw new Error(`[DB] Friends of ${username} not found`);
	return JSON.parse(row.friends);
}

// Retrieve the frieds of the user
export async function getBlockedUsersDB(username: string): Promise<string[]> {
	const result = await query(
		`
		SELECT blocked FROM users WHERE username = $1
	`,
		[username]
	);
	const row = result.rows[0];
	if (!row) throw new Error(`[DB] Blocked users for ${username} not found`);
	return JSON.parse(row.blocked);
}

//OAUTH
// Retrieve the username of a GithubUser
export async function getGithubUserByProviderIdDB(providerId: string): Promise<string | undefined> {
	const result = await query(
		`
		SELECT username
		FROM users
		WHERE provider = 'github' AND provider_id = $1
		LIMIT 1
	`,
		[providerId]
	);
	return result.rows[0]?.username;
}
