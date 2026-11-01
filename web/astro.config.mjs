// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

const BACKEND = process.env.BHUMITRA_API_ORIGIN || "https://api.prettyplot.in";

// In development the browser calls same-origin /api/*, and Vite forwards it to the
// backend. Production does the same through functions/api/[[path]].ts on Cloudflare
// Pages. Either way the backend sees a server-to-server request, so its CORS
// allow-list never blocks the website.
export default defineConfig({
  site: "https://getbhumitra.in",
  integrations: [react()],
  // The dev toolbar sits at the bottom centre, over the phone "Explore Odisha" tab.
  devToolbar: { enabled: false },
  vite: {
    server: {
      proxy: {
        "/api": {
          target: BACKEND,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, "/api/v1"),
          configure: (proxy) => {
            proxy.on("proxyReq", (req) => {
              req.removeHeader("origin");
              req.removeHeader("referer");
              req.setHeader("user-agent", "BhumitraWeb/0.1");
            });
          },
        },
      },
    },
  },
});
