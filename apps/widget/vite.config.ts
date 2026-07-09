import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: '../web/public/widget-dist',
    emptyOutDir: true,
    lib: {
      entry: "src/main.tsx",
      name: "LeadPilotWidget",
      formats: ["iife"],
      fileName: () => "widget.js"
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    },
    cssCodeSplit: false,
    minify: true
  }
});
