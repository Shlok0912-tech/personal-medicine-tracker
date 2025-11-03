import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

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
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: 'auto',
        includeAssets: ['Appiconandlogo.jpg'],
        manifest: {
          id: "/",
          name: "Meditrack",
          short_name: "Meditrack",
          description: "Track your medicines and glucose levels with an easy-to-use personal health tracker",
          theme_color: "#4CAF50",
          background_color: "#ffffff",
          display: "standalone",
          display_override: ["standalone", "minimal-ui"],
          orientation: "portrait",
          scope: "/",
          start_url: "/",
          icons: [
            {
              src: "/Appiconandlogo.jpg",
              sizes: "192x192",
              type: "image/jpeg"
            },
            {
              src: "/Appiconandlogo.jpg",
              sizes: "256x256",
              type: "image/jpeg"
            },
            {
              src: "/Appiconandlogo.jpg",
              sizes: "384x384",
              type: "image/jpeg"
            },
            {
              src: "/Appiconandlogo.jpg",
              sizes: "512x512",
              type: "image/jpeg"
            },
            {
              src: "/Appiconandlogo.jpg",
              sizes: "512x512",
              type: "image/jpeg",
              purpose: "maskable"
            }
          ]
        },
        workbox: {
          clientsClaim: true,
          skipWaiting: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-static-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        },
        devOptions: {
          enabled: false // Disable in dev mode for faster reload
        }
      })
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
