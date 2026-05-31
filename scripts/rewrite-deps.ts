import path from "node:path";
const file = path.join(import.meta.dirname!, "../deno.json");
const c = await Deno.readTextFile(file).then((text) => JSON.parse(text));
if (!c.imports) c.imports = {};
c.imports.hono = c.imports.hono = "jsr:@hono/hono@^4.7.2";
await Deno.writeTextFile(file, JSON.stringify(c, null, 2));
