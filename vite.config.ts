import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  plugins: [
    react(),
    // Required for DuckDB-WASM which uses top-level await
    topLevelAwait(),
  ],
  optimizeDeps: {
    exclude: ["@duckdb/duckdb-wasm"],
  },
  server: {
    port: 3000,
    headers: {
      // Required for SharedArrayBuffer used by DuckDB-WASM
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        // Split large vendor chunks for better caching
        manualChunks: {
          "react-vendor":   ["react", "react-dom", "react-router-dom"],
          "supabase":       ["@supabase/supabase-js"],
          "pdf-lib":        ["pdf-lib"],
          "pptxgenjs":      ["pptxgenjs"],
          "xlsx":           ["xlsx"],
        },
      },
    },
  },
  // Required for DuckDB-WASM SharedArrayBuffer support in production
  preview: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
