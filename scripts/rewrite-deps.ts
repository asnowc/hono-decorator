import path from "node:path";
const file = path.join(import.meta.dirname!, "../deno.json");
const c = await Deno.readTextFile(file).then((text) => JSON.parse(text));
c.imports.hono = c.imports.hono.replace("npm:", "jsr:");
await Deno.writeTextFile("deno.json", JSON.stringify(c, null, 2));
