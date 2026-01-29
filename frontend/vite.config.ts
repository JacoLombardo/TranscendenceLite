import { defineConfig } from "vite";
import fs from "node:fs";

const tlsKeyPath = "/run/secrets/tls_key";
const tlsCertPath = "/run/secrets/tls_cert";
const hasTls =
	fs.existsSync(tlsKeyPath) &&
	fs.existsSync(tlsCertPath) &&
	fs.statSync(tlsKeyPath).isFile() &&
	fs.statSync(tlsCertPath).isFile();

export default defineConfig({
	server: {
		host: "0.0.0.0",
		port: 5173,
		https: hasTls
			? {
					key: fs.readFileSync(tlsKeyPath), // or a bind-mounted path
					cert: fs.readFileSync(tlsCertPath),
				}
			: false,
		proxy: {
			// Anything starting with /api is proxied to the backend container
			"/api": {
				target: `${hasTls ? "https" : "http"}://backend:4000`,
				changeOrigin: true,
				secure: false,
				ws: true,
			},
		},
	},
});

// import basicSsl from "@vitejs/plugin-basic-ssl";

// // https://vitejs.dev/config/
// export default defineConfig({
// 	plugins: [basicSsl()],
// 	server: {
// 		host: "0.0.0.0",
// 		port: 5173,
// 		// https: true,
// 	},
// });
