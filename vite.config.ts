import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const sheetsUrl = env.VITE_SHEETS_WEB_APP_URL || "";
  return {
    server: {
      host: "::",
      port: 8080,
      proxy: sheetsUrl
        ? {
            "/sheets": {
              target: sheetsUrl,
              changeOrigin: true,
              secure: false,
              followRedirects: true,
              rewrite: (p) => p.replace(/^\/sheets/, ""),
              configure: (proxy) => {
                proxy.on('proxyReq', (proxyReq) => {
                  proxyReq.setHeader('Origin', 'https://script.google.com');
                  proxyReq.setHeader('Referer', 'https://script.google.com/');
                });
              },
            },
          }
        : undefined,
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
