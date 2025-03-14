import { expect, test } from "vitest";
import {
  applyController,
  createMetadataDecoratorFactory,
  Get,
  getEndpointContext,
  Post,
  Use,
} from "@asla/hono-decorator";
import { Context, Hono, MiddlewareHandler } from "hono";

test("Use an Endpoint to set the GET route", async function () {
  const Roles = createMetadataDecoratorFactory<Set<string>, string[]>(function (args, decoratorContext) {
    if (decoratorContext.metadata) {
      for (const arg of args) {
        decoratorContext.metadata.add(arg);
      }
    } else {
      return new Set(args);
    }
  });
  function includeRoles(match: Set<string>, input?: Set<string>) {
    if (!input?.size) return false;
    return match.intersection(input).size > 0;
  }
  const RolesGuard: MiddlewareHandler = async function (ctx, next) {
    const body = await ctx.req.json();
    const currentRoles = new Set<string>(body);

    const endpointContext = getEndpointContext(ctx);

    let roles = endpointContext.getControllerMetadata<Set<string>>(Roles);
    if (roles && !includeRoles(roles, currentRoles)) return ctx.body(null, 403);

    roles = endpointContext.getEndpointMetadata<Set<string>>(Roles);
    if (roles && !includeRoles(roles, currentRoles)) return ctx.body(null, 403);
    return next();
  };

  @Roles("admin")
  @Use(RolesGuard)
  class Controller {
    @Roles("root", "test") // admin && (root || test)
    @Post("/create")
    create(ctx: Context) {
      return ctx.text("ok");
    }
    @Post("/delete") // admin
    delete(ctx: Context) {
      return ctx.text("ok");
    }
  }

  const hono = new Hono();
  applyController(hono, new Controller());

  const ADMIN = JSON.stringify(["admin"]);
  const ROOT = JSON.stringify(["root"]);
  const ADMIN_AND_ROOT = JSON.stringify(["admin", "root"]);

  await expect(hono.request("/delete", { method: "POST", body: JSON.stringify([]) })).resolves.responseStatus(403);
  await expect(hono.request("/delete", { method: "POST", body: ADMIN })).resolves.responseStatus(200);

  await expect(hono.request("/create", { method: "POST", body: ADMIN })).resolves.responseStatus(403);
  await expect(hono.request("/create", { method: "POST", body: ROOT })).resolves.responseStatus(403);
  await expect(hono.request("/create", { method: "POST", body: ADMIN_AND_ROOT })).resolves.responseStatus(200);
});
test("A property gets the context of multiple endpoints", async function () {
  const Custom = createMetadataDecoratorFactory<string, string[]>(function (args) {
    return args[0];
  });

  class Controller {
    @Custom("root")
    @Post("/create")
    @Get("/create")
    create(ctx: Context) {
      const endpointContext = getEndpointContext(ctx);
      const value = endpointContext.getEndpointMetadata<string>(Custom) ?? "none";

      return ctx.text(value);
    }
  }
  const hono = new Hono();
  applyController(hono, new Controller());

  await expect(hono.request("/create", { method: "POST" })).resolves.responseSuccessWith("text", "root");
  await expect(hono.request("/create", { method: "GET" })).resolves.responseSuccessWith("text", "root");
});
