import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["src/**/*.test.{js,jsx,ts,tsx}"],
    exclude: ["e2e/**", "dist/**", "node_modules/**"],
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    css: true,
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
