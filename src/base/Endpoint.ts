import { createInitDecorateMeta, privateControllerMeta } from "./_metadata.ts";
import type { ControllerMeta } from "./_type.ts";

import { DecoratePrivatePropertyError, DecoratorKindError } from "./errors.ts";

export type EndpointDecoratorTarget = (...args: any[]) => any;
/**
 * @typeParam T: Constrains the type of decoration target
 */
export type EndpointDecorator<T extends EndpointDecoratorTarget = EndpointDecoratorTarget> = (
  input: T | undefined,
  context: ClassMethodDecoratorContext<unknown, T> | ClassFieldDecoratorContext<unknown, T>,
) => void;

export function Endpoint(path: string, method?: string): EndpointDecorator {
  return function (
    input: undefined | EndpointDecoratorTarget,
    ctx: ClassMethodDecoratorContext | ClassFieldDecoratorContext,
  ) {
    const kind = ctx.kind;
    if (!(kind === "method" || kind === "field")) {
      throw new DecoratorKindError("method, field", kind as string);
    }
    if (ctx.private) throw new DecoratePrivatePropertyError();

    const config = getInitDecorateMeta(ctx.metadata);
    const key = (method ? method : "") + ":" + path;
    if (config.endpoints.has(key)) {
      throw new Error("One controller cannot be configured with multiple routes of the same type");
    }

    config.endpoints.set(key, { key: ctx.name, path, method });
    let endpointMetadata = config.fieldMetadataMap.get(ctx.name);
    if (!endpointMetadata) {
      endpointMetadata = new Map();
      config.fieldMetadataMap.set(ctx.name, endpointMetadata);
    }
  };
}
function getInitDecorateMeta(meta: object): ControllerMeta {
  let controllerMeta = privateControllerMeta.getMetadata(meta);
  if (!controllerMeta) {
    if (typeof meta !== "object") throw new Error("Unable to retrieve metadata");
    controllerMeta = createInitDecorateMeta();
    privateControllerMeta.set(meta, controllerMeta);
  }
  return controllerMeta;
}
