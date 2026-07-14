import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue()],
  clearScreen: false,
  server: {
    host: "127.0.0.1",
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  resolve: {
    alias: {
      "@mirax/core": fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url)),
      "@mirax/media-pipeline": fileURLToPath(new URL("../../packages/media-pipeline/src/index.ts", import.meta.url)),
      "@mirax/provider-ai": fileURLToPath(new URL("../../packages/provider-ai/src/index.ts", import.meta.url)),
      "@mirax/provider-publish": fileURLToPath(new URL("../../packages/provider-publish/src/index.ts", import.meta.url)),
      "@mirax/local-store": fileURLToPath(new URL("../../packages/local-store/src/index.ts", import.meta.url)),
    },
  },
  build: {
    target: "es2022",
  },
});
