import { expect, test } from "vitest";
import { applyController, DecoratorKindError, Endpoint } from "@asla/hono-decorator";
import { Context, Hono } from "hono";

test("Use an Endpoint to set the GET route", async function () {
  class Controller {
    @Endpoint("/test", "GET")
    method(ctx: Context) {
      return ctx.text("method");
    }
    @Endpoint("/handler", "GET")
    handler = (ctx: Context) => {
      return ctx.text("handler");
    };
  }

  const hono = new Hono();
  applyController(hono, new Controller());

  await expect(hono.request("/test")).resolves.responseSuccessWith("text", "method");
  await expect(hono.request("/handler")).resolves.responseSuccessWith("text", "handler");
});
test("Use an endpoint to set routes for all methods", async function () {
  class Controller {
    @Endpoint("/test")
    test(ctx: Context) {
      return ctx.text(ctx.req.method);
    }
  }

  const hono = new Hono();
  applyController(hono, new Controller());

  await expect(hono.request("/test")).resolves.responseSuccessWith("text", "GET");
  await expect(hono.request("/test", { method: "POST" })).resolves.responseSuccessWith("text", "POST");
});
test("A handler can apply multiple Endpoint()", async function () {
  class Controller {
    @Endpoint("/test2")
    @Endpoint("/test1")
    handler(ctx: Context) {
      return ctx.body(null);
    }
  }
  const hono = new Hono();
  applyController(hono, new Controller());

  await expect(hono.request("/test1")).resolves.responseStatus(200);

  await expect(hono.request("/test2")).resolves.responseStatus(200);
});

test("Endpoint() can only decorate methods and class attributes", async function () {
  expect(() => {
    //@ts-ignore
    @Endpoint("/test")
    class Test {}
  }, "Trying to decorate the class with Endpoint() throws an exception").toThrowError(DecoratorKindError);
  expect(() => {
    class Test {
      //@ts-ignore
      @Endpoint("/test")
      get getter() {
        return;
      }
    }
  }, "Trying to decorate the getter class with Endpoint() throws an exception").toThrowError(DecoratorKindError);
});
