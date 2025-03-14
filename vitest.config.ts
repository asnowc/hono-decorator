import type { ViteUserConfig } from "vitest/config";

export default {
  esbuild: { target: "es2023" },
  test: {
    include: ["./test/**/*.test.ts"],
    setupFiles: ["./test/fixtures/asserts.ts"],
    alias: {
      "@asla/hono-decorator": import.meta.dirname! + "/src/mod.ts",
    },
  },
} satisfies ViteUserConfig;
