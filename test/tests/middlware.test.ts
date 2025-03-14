import { applyController, Controller, Get, Use } from "@asla/hono-decorator";
import { Context, Hono, MiddlewareHandler } from "hono";
import { describe, expect, test } from "vitest";
import { MIDDLEWARE_SET_KEY } from "../fixtures/hono.ts";
test("Use() applies to the endpoint", async function () {
  class Controller {
    @Use(keyMiddleware("A"))
    @Get("/")
    method(ctx: Context) {
      return ctx.json(ctx.get(MIDDLEWARE_SET_KEY));
    }
  }
  const hono = new Hono();
  applyController(hono, new Controller());

  await expect(hono.request("/")).resolves.responseSuccessWith("json", ["A"]);
});
test("Use() Applies to the controller", async function () {
  @Use(keyMiddleware("Mid"))
  class Controller {
    @Get("/a")
    methodA(ctx: Context) {
      return ctx.json(["methodA", ...ctx.get(MIDDLEWARE_SET_KEY)]);
    }
    @Get("/b")
    methodB(ctx: Context) {
      return ctx.json(["methodB", ...ctx.get(MIDDLEWARE_SET_KEY)]);
    }
  }
  const hono = new Hono();
  applyController(hono, new Controller());

  await expect(hono.request("/a")).resolves.responseSuccessWith("json", ["methodA", "Mid"]);
  await expect(hono.request("/b")).resolves.responseSuccessWith("json", ["methodB", "Mid"]);
});
test("Use() cannot be applied to controllers without endpoints", async function () {
  expect(() => {
    @Use(keyMiddleware("A"))
    class Controller {}
  }).toThrowError();

  expect(() => {
    class Controller {
      @Use(keyMiddleware("A"))
      method() {}
    }
  }).toThrowError();
});

describe("Order of middleware", function () {
  const A = keyMiddleware("A");
  const B = keyMiddleware("B");
  const C = keyMiddleware("C");
  const D = keyMiddleware("D");
  const E = keyMiddleware("E");
  const F = keyMiddleware("F");
  const G = keyMiddleware("G");
  const H = keyMiddleware("H");

  @Use(A)
  @Use(B)
  class TestA {
    @Use(G)
    @Use(H)
    @Get("/")
    method(ctx: Context) {
      return ctx.json(ctx.get(MIDDLEWARE_SET_KEY));
    }
  }

  test("The order in which requests pass through the controller middleware", async function () {
    const hono = new Hono();
    applyController(hono, new TestA());
    await expect(hono.request("/")).resolves.responseSuccessWith("json", ["A", "B", "G", "H"]);
  });
  test("The order in which requests pass through the inherited controller middleware", async function () {
    const hono = new Hono();

    @Use(C)
    @Use(D)
    @Controller({ extends: true })
    class TestB extends TestA {}

    @Use(E)
    @Use(F)
    @Controller({ extends: true })
    class TestC extends TestB {
      @Use(G)
      @Use(H)
      @Get("/sub")
      sub(ctx: Context) {
        return ctx.json(ctx.get(MIDDLEWARE_SET_KEY));
      }
    }
    applyController(hono, new TestC());

    await expect(hono.request("/sub")).resolves.responseSuccessWith("json", ["E", "F", "G", "H"]);
    await expect(hono.request("/")).resolves.responseSuccessWith("json", ["E", "F", "C", "D", "A", "B", "G", "H"]);
  });
});

function keyMiddleware(key: string): MiddlewareHandler {
  return (ctx, next) => {
    let list: string[] | undefined = ctx.get(MIDDLEWARE_SET_KEY);
    if (!list) {
      list = [];
      ctx.set(MIDDLEWARE_SET_KEY, list);
    }
    list.push(key);

    return next();
  };
}
