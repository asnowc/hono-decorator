import type { MiddlewareHandler } from "hono";
export function keyMiddleware(key: string): MiddlewareHandler {
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
export const MIDDLEWARE_SET_KEY = "MIDDLEWARE_SET_KEY";
