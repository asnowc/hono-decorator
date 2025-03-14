import { applyController, Controller, Get, Use } from "@asla/hono-decorator";
import { Context, Hono } from "hono";
import { expect, test } from "vitest";
import { keyMiddleware, MIDDLEWARE_SET_KEY } from "../fixtures/hono.ts";

@Use(keyMiddleware("MidA"))
@Controller({ basePath: "/animal" })
class Animal {
  @Get("/eat")
  eat(ctx: Context): Response {
    const keys = ctx.get(MIDDLEWARE_SET_KEY) ?? [];
    return ctx.json(["Animal eat", ...keys]);
  }
  @Get("/sleep")
  sleep(ctx: Context): Response {
    const keys = ctx.get(MIDDLEWARE_SET_KEY) ?? [];
    return ctx.json(["Animal sleep", ...keys]);
  }
}

test("The decorator of the parent class is not applied by default", async function () {
  @Use(keyMiddleware("MidA"))
  @Controller({ basePath: "/animal" })
  class Animal {
    @Get("/eat")
    eat(ctx: Context): Response {
      const keys = ctx.get(MIDDLEWARE_SET_KEY) ?? [];
      return ctx.json(["Animal eat", ...keys]);
    }
    @Get("/sleep")
    sleep(ctx: Context): Response {
      const keys = ctx.get(MIDDLEWARE_SET_KEY) ?? [];
      return ctx.json(["Animal sleep", ...keys]);
    }
  }
  class Bird extends Animal {
    @Get("/fly")
    fly(ctx: Context) {
      const keys = ctx.get(MIDDLEWARE_SET_KEY) ?? [];
      return ctx.json(["Bird fly", ...keys]);
    }
  }
  const hono = new Hono();
  applyController(hono, new Bird());

  await expect(hono.request("/animal/eat"), "The route of the parent class is not inherited").resolves.responseStatus(
    404,
  );
  await expect(hono.request("/eat")).resolves.responseStatus(404);

  await expect(hono.request("/fly"), "The parent class of middleware is not inherited").resolves.responseSuccessWith(
    "json",
    ["Bird fly"],
  );
  await expect(hono.request("/animal/fly")).resolves.responseStatus(404);
});

test("extends inherits only the decorative information of a parent class", async function () {
  class Bird extends Animal {
    @Get("/fly")
    fly(ctx: Context) {
      const keys = ctx.get(MIDDLEWARE_SET_KEY) ?? [];
      return ctx.json(["Bird fly", ...keys]);
    }
  }
  @Controller({ extends: true })
  class SeaGull extends Bird {
    @Get("/tweet")
    tweet(ctx: Context) {
      const keys = ctx.get(MIDDLEWARE_SET_KEY) ?? [];
      return ctx.json(["SeaGull tweet", ...keys]);
    }
  }
  const hono = new Hono();
  applyController(hono, new SeaGull());

  await expect(hono.request("/eat")).resolves.responseStatus(404);
  await expect(hono.request("/fly")).resolves.responseSuccessWith("json", ["Bird fly"]);
  await expect(hono.request("/tweet")).resolves.responseSuccessWith("json", ["SeaGull tweet"]);
});

test("Routing can be inherited", async function () {
  class Animal {
    @Get("/eat")
    eat(ctx: Context): Response {
      return ctx.text("Animal eat");
    }
  }
  @Controller({ extends: true })
  class Dog extends Animal {
    @Get("/jump")
    jump(ctx: Context) {
      return ctx.text("Dog jump");
    }
  }
  const hono = new Hono();
  applyController(hono, new Dog());
  await expect(hono.request("/eat")).resolves.responseSuccessWith("text", "Animal eat");
  await expect(hono.request("/jump")).resolves.responseSuccessWith("text", "Dog jump");
});
test("The middleware of the parent class cannot act on the routing of the child class", async function () {
  @Use(keyMiddleware("Animal"))
  class Animal {
    @Get("/eat")
    eat(ctx: Context): Response {
      const list = ctx.get(MIDDLEWARE_SET_KEY) ?? [];
      return ctx.json(["Animal eat", ...list]);
    }
  }
  @Controller({ extends: true })
  class Dog extends Animal {
    @Get("/jump")
    jump(ctx: Context) {
      const list = ctx.get(MIDDLEWARE_SET_KEY) ?? [];
      return ctx.json(["Dog jump", ...list]);
    }
  }
  const hono = new Hono();
  applyController(hono, new Dog());

  await expect(hono.request("/eat")).resolves.responseSuccessWith("json", ["Animal eat", "Animal"]);
  await expect(hono.request("/jump")).resolves.responseSuccessWith("json", ["Dog jump"]);
});

test("basePath can be inherited", async function () {
  @Controller({ basePath: "/animal" })
  class Animal {
    @Get("/eat")
    eat(ctx: Context): Response {
      return ctx.text("Animal eat");
    }
  }
  @Controller({ extends: true })
  class Dog extends Animal {
    @Get("/jump")
    jump(ctx: Context) {
      return ctx.text("Dog jump");
    }
  }
  const hono = new Hono();
  applyController(hono, new Dog());
  await expect(hono.request("/jump")).resolves.responseStatus(404);
  await expect(hono.request("/animal/jump")).resolves.responseStatus(200);
});

test("Overrides parent class methods", async function () {
  @Controller({ basePath: "/animal" })
  class Animal {
    @Get("/eat")
    eat(ctx: Context): Response {
      return ctx.text("Animal eat");
    }
  }
  @Controller({ extends: true })
  class Cat extends Animal {
    override eat(ctx: Context): Response {
      return ctx.text("Cat eat");
    }
  }
  const hono = new Hono();
  applyController(hono, new Cat());

  await expect(hono.request("/animal/eat")).resolves.responseSuccessWith("text", "Cat eat");
});

test("Subclasses can override the basePath of the parent class", async function () {
  @Controller({ basePath: "/animal" })
  class Animal {
    @Get("/eat")
    eat(ctx: Context): Response {
      return ctx.text("Animal eat");
    }
  }
  @Controller({ extends: true, basePath: "/api" })
  class Cat extends Animal {}
  const hono = new Hono();
  applyController(hono, new Cat());

  await expect(hono.request("/animal/eat")).resolves.responseStatus(404);
  await expect(hono.request("/api/eat")).resolves.responseStatus(200);
});

test("Subclasses can override the routing of the parent class", async function () {
  class Animal {
    @Get("/eat")
    eat(ctx: Context): Response {
      return ctx.text("Animal eat");
    }
  }

  @Controller({ extends: true })
  class Cat extends Animal {
    @Get("/eat")
    eatHandler(ctx: Context): Response {
      return ctx.text("Cat eat");
    }
  }
  const hono = new Hono();
  applyController(hono, new Cat());

  await expect(hono.request("/eat")).resolves.responseSuccessWith("text", "Cat eat");
});
test("Subclasses middleware can act on the routing of the parent class", async function () {
  @Use(keyMiddleware("Animal"))
  class Animal {
    @Get("/eat")
    eat(ctx: Context): Response {
      const list = ctx.get(MIDDLEWARE_SET_KEY) ?? [];
      return ctx.json(["Animal eat", ...list]);
    }
  }
  @Use(keyMiddleware("Dog"))
  @Controller({ extends: true })
  class Dog extends Animal {}

  const hono = new Hono();
  applyController(hono, new Dog());

  await expect(hono.request("/eat")).resolves.responseSuccessWith("json", ["Animal eat", "Dog", "Animal"]);
});
