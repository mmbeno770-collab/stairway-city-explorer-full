import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  publicDir: "public",
  build: {
    outDir: "www",
    emptyOutDir: true,
    sourcemap: false,
    target: "es2022",
    chunkSizeWarningLimit: 1800
  }
});
