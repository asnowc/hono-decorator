## Description

`@asla/hono-decorator` allows you to define routes, middleware, etc., using ECMA Decorators.

Currently, this is experimental. If you want to try it in your project, you can use git submodules to add this
repository to your project and compile it yourself using a monorepo.

ECMA Decorators are currently at Stage 3. In the future, they will become part of the JavaScript syntax standard. For
now, we can use this syntax through TypeScript. We can leverage decorators and decorator metadata to implement decorator
functionality similar to Nest.

Since Stage 3 decorators do not include parameter decorators, this only considers using decorators for route definition,
not dependency injection.

**A Simple Example**

```ts
import { Context, Hono } from "hono";
import { applyController, Controller, Get, Post, ToResponse, Use } from "@asla/hono-decorator";
import { compress } from "hono/compress";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";

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

  @ToResponse((data, ctx) => {
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
// Apply more...

await hono.request("/api/test3");
```

## API Design

After applying decorators, metadata is actually added to the class. When calling `applyController()`, the metadata of
the class is read, and routes and middleware are set according to the metadata.

### Endpoint Decorators

Endpoint decorators add routing information to a class. They are the foundation of all decorators. Before applying other
decorators, the endpoint decorator must be applied, and only one endpoint decorator can be applied to a method or
property.

```ts
export type EndpointDecoratorTarget = (...args: any[]) => any;
/**
 * @typeParam T Constrains the type of decoration target
 */
export type EndpointDecorator<T extends EndpointDecoratorTarget = EndpointDecoratorTarget> = (
  input: T | undefined,
  context: ClassMethodDecoratorContext<unknown, T> | ClassFieldDecoratorContext<unknown, T>,
) => void;

export declare function Endpoint(path: string, method?: string): EndpointDecorator;

export function Post(path: string): EndpointDecorator {
  return Endpoint(path, "POST");
}
export function Get(path: string): EndpointDecorator {
  return Endpoint(path, "GET");
}

// The same is true of other common methods such as Patch and Put
```

```ts
class Test {
  @Get("/test1")
  @Use() // Throw: Before applying the middleware decorator, you must apply the endpoint decorator
  method1() {}

  @Get("/test2") // Throw: The route cannot be configured twice
  @Get("/test1")
  method2() {}
}
```

### Controller Decorators

Controller decorators can define behaviors for a set of routes. They can only be applied to classes.

```ts
export type ControllerDecoratorTarget = new (...args: any[]) => any;

/**
 * @typeParam T Constrains the type of decoration target
 */
export type ControllerDecorator<T extends ControllerDecoratorTarget = ControllerDecoratorTarget> = (
  input: T,
  context: ClassDecoratorContext<T>,
) => void;

export type ControllerOption = {
  /** Inherit the decorator from the parent class */
  extends?: boolean;
  basePath?: string;
};

export declare function Controller(option: ControllerOption): ControllerDecorator;
```

### Middleware Decorators

```ts
export type MiddlewareDecoratorTarget = ControllerDecoratorTarget | EndpointDecoratorTarget;
export type MiddlewareDecorator<T extends MiddlewareDecoratorTarget = MiddlewareDecoratorTarget> = (
  input: unknown,
  context: ClassDecoratorContext | ClassMethodDecoratorContext | ClassFieldDecoratorContext,
) => void;
```

Middleware decorators can be applied to classes, methods, or properties. The order in which requests pass through
middleware is from outer to inner (the opposite of the order in which decorators are called, which allows for a more
intuitive understanding of the process from request to route handler).

```ts
@Use(A)
@Use(B)
@Use(C)
class Controller {
  @Use(D)
  @Use(E)
  @Use(F)
  @Get("/test")
  method() {}
}
```

The order in which requests pass through: A>B>C>D>E>F > method() >F>E>D>C>B>A

### Conversion Decorators

Conversion decorators can convert the Hono Context object into parameters required by controller methods, and can also
convert objects returned by controller methods into Response objects.

```ts
class Controller {
  @Get("/test1")
  method1(ctx: Context) {} //If the PipeInput decorator is not applied, the first argument is passed to Context

  @ToArguments(function (ctx: Context) {
    //The returned type is the same as the parameter for method2
    // If types are inconsistent, typescript prompts an exception
    return [1, "abc"];
  })
  //The type of data is the same as that returned by method2
  // If types are inconsistent, typescript prompts an exception
  @ToResponse((data, ctx: Context) => {
    data.body; // string
    data.title; // string

    //@ts-expect-error content not exist
    data.content;

    return ctx.text("ok");
  })
  @Get("/test2")
  method2(size: number, id: string) {
    return {
      title: "123",
      body: "abc",
    };
  }
}
```

### Custom Decorators

Custom decorators can be created using `createMetadataDecoratorFactory`. In fact, apart from `Endpoint` and
`Controller`, all other decorators are created using `createMetadataDecoratorFactory`.

Here is an example. A custom Roles decorator is created. After decorating with this decorator, specific roles are
required to access the interface.

```ts
import { applyController, createMetadataDecoratorFactory, getEndpointContext, Post, Use } from "@asla/hono-decorator";

const Roles = createMetadataDecoratorFactory<Set<string>, string[]>(function (args, decoratorContext) {
  if (decoratorContext.metadata) {
    // Already set, add roles
    for (const arg of args) {
      decoratorContext.metadata.add(arg);
    }
  } else {
    return new Set(args); // Set data
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

await hono.request("/delete", { method: "POST", body: JSON.stringify([]) }); // 403;
await hono.request("/delete", { method: "POST", body: ADMIN }); // 200;

await hono.request("/create", { method: "POST", body: ADMIN }); // 403;
await hono.request("/create", { method: "POST", body: ROOT }); // 403;
await hono.request("/create", { method: "POST", body: ADMIN_AND_ROOT }); // 200;
```

### Inheritance

If a subclass controller class declares `@Controller({ extends: true })`, the subclass will inherit the routing and
middleware configurations from the parent class; otherwise, it will ignore all decorators from the parent class.

```ts
@Use(bodyLimit({ maxSize: 1024 }))
@Controller({ basePath: "/animal" })
class Animal {
  constructor() {}
  @Get
```
