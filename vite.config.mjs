import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("/three/")) return "three";
          if (id.includes("/@supabase/")) return "supabase";
          if (id.includes("/react") || id.includes("/react-dom") || id.includes("/scheduler")) return "react";
          return "vendor";
        }
      }
    }
  }
});
