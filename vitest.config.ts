import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Test config for the headless terminal suite. These tests drive xterm.js
// (`@xterm/headless`) without a DOM and assert on buffer state, plus pure
// units (stripBackgroundCodes, key handling). Runs locally via `bun run test`
// and in CI with the same command.
export default defineConfig({
  plugins: [react()],
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
