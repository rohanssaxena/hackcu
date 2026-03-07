import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Canvas LMS API  →  /canvas-api/...
      "/canvas-api": {
        target: "https://canvas.colorado.edu",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/canvas-api/, "/api/v1"),
        secure: true,
      },
      // Anthropic API  →  /anthropic-api/...
      "/anthropic-api": {
        target: "https://api.anthropic.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/anthropic-api/, ""),
        secure: true,
      },
    },
  },
});