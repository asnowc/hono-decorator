import { applyController, Controller, Get } from "@asla/hono-decorator";
import { Context, Hono } from "hono";
import { expect, test } from "vitest";

test("basePath", async function () {
  @Controller({ basePath: "/api" })
  class Test {
    @Get("/test")
    handler(ctx: Context) {
      return ctx.text("1");
    }
    @Get("test")
    method(ctx: Context) {
      return ctx.text("2");
    }
  }
  const hono = new Hono();
  applyController(hono, new Test());

  await expect(hono.request("/api/test")).resolves.responseSuccessWith("text", "1");
  await expect(hono.request("/apitest")).resolves.responseSuccessWith("text", "2");
});
test("Repeated definitions can overwrite previously decorated data", async function () {
  @Controller({ basePath: "/prefix" })
  @Controller({ basePath: "/api" })
  class Test {
    @Get("/test")
    handler(ctx: Context) {
      return ctx.text("1");
    }
  }
  const hono = new Hono();
  applyController(hono, new Test());

  await expect(hono.request("/api/test")).resolves.responseStatus(404);
  await expect(hono.request("/prefix/test")).resolves.responseStatus(200);
});
