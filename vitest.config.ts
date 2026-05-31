import type { ViteUserConfig } from "vitest/config";

import deno from "@deno/vite-plugin";

export default {
  plugins: [deno()],
  test: {
    include: ["./test/**/*.test.ts"],
    setupFiles: ["./test/fixtures/asserts.ts"],
  },
} satisfies ViteUserConfig;
