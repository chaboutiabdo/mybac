import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          ui: [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
          ],
          utils: ["clsx", "tailwind-merge", "class-variance-authority"],
        },
      },
    },
  },
  esbuild: {
    // console.* and debugger never reach a production bundle
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
  },
}));
