import cloudinary from "../config/cloudinary.js";

export async function uploadAvatar(filePath: string) {
	if (
		!process.env.CLOUDINARY_CLOUD_NAME ||
		!process.env.CLOUDINARY_API_KEY ||
		!process.env.CLOUDINARY_API_SECRET
	) {
		console.warn("[Cloudinary] Missing credentials; storing avatar as-is.");
		return filePath;
	}
	try {
		const result = await cloudinary.uploader.upload(filePath, {
			folder: "transcendence/avatars",
		});
		console.log("Avatar uploaded:", result.secure_url);
		return result.secure_url;
	} catch (error) {
		throw new Error("[Cloudinary] Failed to upload avatar: " + (error as Error).message);
	}
}
