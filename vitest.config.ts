import path from "path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    root: __dirname,
    environment: "jsdom",
    globals: true,
    watch: false,
    setupFiles: ["./src/setupTests.ts"],
    typecheck: {
      enabled: true,
      tsconfig: path.join(__dirname, "tsconfig.json"),
    },
  },
}) 