// Convert UTC-ish timestamps to local display, fallback to dash.
export function convertUTCStringToLocal(dateString?: string | null): string {
	if (!dateString) return "—";
	const trimmed = dateString.trim();
	const hasTimezone = /[zZ]|[+-]\d{2}:\d{2}$/.test(trimmed);
	const isoUtcString = hasTimezone ? trimmed : `${trimmed.replace(" ", "T")}Z`;
	const date = new Date(isoUtcString);

	// Safety check
	if (isNaN(date.getTime())) {
		return "—";
	}

	// 2. Helper to pad single digits (e.g., 9 -> "09")
	const pad = (num: number): string => num.toString().padStart(2, "0");

	// 3. Extract components using LOCAL system time methods
	const year = date.getFullYear();
	const month = pad(date.getMonth() + 1); // Months are 0-indexed
	const day = pad(date.getDate());
	const hours = pad(date.getHours());
	const minutes = pad(date.getMinutes());
	const seconds = pad(date.getSeconds());

	// 4. Return in the requested format
	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
