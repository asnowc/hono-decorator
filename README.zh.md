## 描述

`@asla/hono-decorator` 允许您使用 ECMA Decorators 定义路由、中间件等

目前，这是实验性的，如果要在项目中尝试，可以使用 git submodules 将该仓库引入到你的项目中，通过 monorepo 自行编译使用

ECMA 装饰器，目前处以 Stage 3。在未来，它将成为 JavaScript 语法标准。而现在，我们可以通过 TypeScript
使用该语法我们可以利用装饰器和装饰器元数据，实现类似 Nest 的装饰器功能。\
由于 Stage 3 的装饰器不包括参数装饰器，这里只考虑使用装饰器进行路由定义，不考虑依赖注入。

**一个简单的示例**

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

## API 设计

在应用装饰器后，实际上只是给这个类添加元数据，在调用 `applyController()`
时，通过读取这个类的元数据，然后根据元数据设置路由、中间件。

### 端点装饰器

端点装饰器为类添加了路由信息。它是所有装饰器的基础。在应用其他装饰器前，必须应用端点装饰器，且一个方法或属性只能应用一个端点装饰器

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

### 控制器装饰器

控制器装饰器可以定义一组路由的一些行为。它只能应用到类上面

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

### 中间件装饰器

```ts
export type MiddlewareDecoratorTarget = ControllerDecoratorTarget | EndpointDecoratorTarget;
export type MiddlewareDecorator<T extends MiddlewareDecoratorTarget = MiddlewareDecoratorTarget> = (
  input: unknown,
  context: ClassDecoratorContext | ClassMethodDecoratorContext | ClassFieldDecoratorContext,
) => void;
```

中间件装饰器可以装饰器在类、方法或属性，请求经过中间件的顺序由外到内（与装饰器调用的顺序相反，这样可以更直观感受请求到路由处理程序的过程）

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

请求经过的顺序： A>B>C>D>E>F > method() >F>E>D>C>B>A

### 转换装饰器

转换装饰器可以将 Hono 的 Context 对象转换为控制器方法所需的参数，也可以将控制器方法返回的对象转换为 Response 对象

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

### 自定义装饰器

可以通过 `createMetadataDecoratorFactory` 创建自定义装饰器。实际上，除了 `Endpoint` 和 `Controller`,
其他的装饰器都是通过 `createMetadataDecoratorFactory` 创建的。

下面是一个示例。自定义了 Roles 装饰器。该装饰器可以装饰后，需要特定角色才能访问接口

```ts
import { applyController, createMetadataDecoratorFactory, getEndpointContext, Post, Use } from "@asla/hono-decorator";

const Roles = createMetadataDecoratorFactory<Set<string>, string[]>(function (args, decoratorContext) {
  if (decoratorContext.metadata) {
    // 已设置，添加角色
    for (const arg of args) {
      decoratorContext.metadata.add(arg);
    }
  } else {
    return new Set(args); // 设置数据
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

### 继承

如果子类控制器类声明了 `@Controller({ extends: true })`,
那么子类会继承父类的路由与中间件等配置，否则会忽略父类的一切装饰器

```ts
@Use(bodyLimit({ maxSize: 1024 }))
@Controller({ basePath: "/animal" })
class Animal {
  constructor() {}
  @Get("/eat")
  eat() {
    return "Animal eat";
  }
  @Get("/speak")
  speak() {
    return "Animal speak";
  }
}

/**
 * Animal routing and middleware will not be applied
 * Add `/fly`
 */
class Bird extends Animal {
  @Get("/fly")
  fly() {
    return "Bird fly";
  }
}
/**
 * 继承中间件和路由
 * Add `/animal/sleep`, `/animal/eat`, `/animal/speak`
 */
@Controller({ extends: true })
class Dog extends Animal {
  @Get("/sleep")
  sleep() {
    return "Dog sleep";
  }
}
```

如果调用 `applyController(hono, new Bird())`, 将只添加`/fly` ，且 Animal 上定义的 中间件也不会生效 如果调用
`applyController(hono, new Dog())`, 将只添加 `/animal/sleep`, `/animal/eat`, `/animal/speak`, 其这些请求都会经过 Animal
上应用的 bodyLimit 装饰器

我们也可以在子类修改父类的一下设定

```ts
/**
 * 继承中间件和路由，并修改一些设定
 * Add `/run`, `/eat`, `/speak`
 * Get `/eat` will response `Cat eat`
 * Get `/speak` will response `Cat speak`
 */
@Controller({ extends: true, basePath: "" })
class Cat extends Animal {
  @Get("/run")
  run() {
    return "Cat run";
  }
  override eat() {
    return "Cat eat";
  }
  @Get("/speak")
  catSpeak() {
    return "Cat speak";
  }
}
```

这个例子，重写了 basePath、eat() 方法和 /speak 路由

如果调用 `applyController(hono, new Cat())`, 将只添加 `/run`, `/eat`, `/speak` GET /eat 返回 `Cat eat` GET /speak 返回
`Cat speak`
