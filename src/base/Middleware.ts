import type { MiddlewareHandler } from "hono";
import { createMetadataDecoratorFactory } from "./factory.ts";

//  type MiddlewareDecoratorTarget = ControllerDecoratorTarget | EndpointDecoratorTarget;
export type MiddlewareDecorator = (
  input: unknown,
  context: ClassDecoratorContext | ClassMethodDecoratorContext | ClassFieldDecoratorContext,
) => void;
/**
 * Use Middleware
 */
export const Use: (middleware: MiddlewareHandler) => MiddlewareDecorator = createMetadataDecoratorFactory<
  MiddlewareHandler[],
  [MiddlewareHandler]
>(function (args, { metadata }) {
  const middleware = args[0];
  if (!metadata) return [middleware];
  metadata.unshift(middleware);
  return;
});
