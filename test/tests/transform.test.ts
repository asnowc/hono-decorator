import { expect, test } from "vitest";
import { Hono } from "hono";
import { applyController, Get, PipeInput, PipeOutput, ToArguments, ToResponse } from "@asla/hono-decorator";

test("transform", async function () {
  class Controller {
    @ToArguments(async function (ctx) {
      const title = ctx.req.query("title")!;
      const number = ctx.req.query("number")!;
      return [title, +number] as const;
    })
    @ToResponse(function (data, ctx) {
      return ctx.text(data.body);
    })
    @Get("/transform")
    method(title: string, num: number) {
      return { body: title + num };
    }
  }

  const hono = new Hono();
  applyController(hono, new Controller());

  await expect(hono.request("/transform?title=hi&number=12")).resolves.responseSuccessWith("text", "hi12");
});
test("ToResponse() Decorative controller", async function () {
  @ToResponse(function (result, ctx) {
    return ctx.text(result as string);
  })
  class Controller {
    @Get("/transform")
    method() {
      return "ok";
    }
  }

  const hono = new Hono();
  applyController(hono, new Controller());

  await expect(hono.request("/transform")).resolves.responseSuccessWith("text", "ok");
});

test("ToArguments() cannot be used twice on the same target", async function () {
  expect(() => {
    class Controller {
      @ToArguments((ctx) => [])
      @ToArguments((ctx) => [])
      @Get("/transform")
      method() {}
    }
  }).toThrowError();
});
test("ToArguments() can only accept one function parameter", async function () {
  expect(() => {
    class Controller {
      //@ts-expect-error
      @ToArguments({})
      @Get("/transform")
      method() {}
    }
  }).toThrowError();
  expect(() => {
    class Controller {
      //@ts-expect-error
      @ToArguments()
      @Get("/transform")
      method() {}
    }
  }).toThrowError();
});

test("The Endpoint decorator must be applied before ToArguments() can be applied", async function () {
  expect(() => {
    class Controller {
      @ToArguments((ctx) => [])
      method() {}
    }
  }).toThrowError();
});
test("ToResponse() cannot be used twice on the same target", async function () {
  expect(() => {
    class Controller {
      @ToResponse((data, ctx) => ctx.body(null, 200))
      @ToResponse((data, ctx) => ctx.body(null, 200))
      @Get("/transform")
      method() {}
    }
  }).toThrowError();
});

test("The Endpoint decorator must be applied before ToResponse() can be applied", async function () {
  expect(() => {
    class Controller {
      @ToResponse((data, ctx) => ctx.body(null, 200))
      method() {}
    }
  }).toThrowError();
});
test("ToResponse() can only accept one function parameter", async function () {
  expect(() => {
    class Controller {
      //@ts-expect-error
      @ToResponse({})
      @Get("/transform")
      method() {}
    }
  }).toThrowError();
  expect(() => {
    class Controller {
      //@ts-expect-error
      @ToResponse()
      @Get("/transform")
      method() {}
    }
  }).toThrowError();
});
test("Pipe link", async function () {
  class Controller {
    @PipeInput(
      function (ctx) {
        return ctx.req.query("title")!;
      },
      function (title) {
        return title + "1";
      },
      async function (title) {
        return title + "2";
      },
    )
    @PipeOutput(
      function (data) {
        return "a" + data;
      },
      function (data) {
        return "b" + data;
      },
      function (data, ctx) {
        return ctx.text(data);
      },
    )
    @Get("/transform")
    async method(title: string) {
      return title;
    }
  }

  const hono = new Hono();
  applyController(hono, new Controller());

  await expect(hono.request("/transform?title=hi")).resolves.responseSuccessWith("text", "bahi12");
});
