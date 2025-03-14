import { Context, Hono } from "hono";
import { applyController, Controller, Get, PipeOutput, Post, Use } from "@asla/hono-decorator";
import { compress } from "hono/compress";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { expect, test } from "vitest";

test("combined use", async function () {
  @Use(cors({ origin: "*" }))
  @Controller({ basePath: "/api" })
  class TestController {
    @Use(compress())
    @Use(bodyLimit({ maxSize: 1024 }))
    @Post("/test1")
    method1(ctx: Context) {
      return ctx.json({ ok: 1 });
    }

    @Get("/test2")
    method2 = () => {};

    @PipeOutput((data, ctx) => {
      data.body; // string
      data.title; // string

      //@ts-expect-error Field "content" does not exist
      data.content;

      return ctx.html(
        `<html>
          <head>
            <title>${data.title}</title>
          </head>
          <body>
          ${data.body}
          </body>
        </html>`,
      );
    })
    @Get("/test3")
    method3(ctx: Context) {
      return {
        title: "123",
        body: "abc",
      };
    }
  }
  const hono = new Hono();
  applyController(hono, new TestController());

  await expect(hono.request("/api/test3")).resolves.responseStatus(200);
});
