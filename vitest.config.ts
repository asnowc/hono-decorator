import type { ViteUserConfig } from "vitest/config";

import deno from "@deno/vite-plugin";

export default {
  plugins: [deno()],
  test: {
    include: ["./test/**/*.test.ts"],
    setupFiles: ["./test/fixtures/asserts.ts"],
    alias: {
      // Due to the presence of package.json, vitest will prioritize resolving the exports field in package.json, which prevents correct resolution to src/mod.ts. Therefore, we need to use an absolute path to specify the module location.
      "@asla/hono-decorator": import.meta.dirname! + "/src/mod.ts",
    },
  },
} satisfies ViteUserConfig;
