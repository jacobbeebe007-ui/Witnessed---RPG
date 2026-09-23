import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  optimizeDeps: {
    // Pre-bundle Phaser so the first visit does not stall on the HTML loading screen
    // while Vite discovers/optimizes a multi-megabyte dependency.
    include: ["phaser"],
  },
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 1500,
  },
});
