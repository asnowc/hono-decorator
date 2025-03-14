import { privateControllerMeta } from "./_metadata.ts";

import { DecorateNotEndpointError } from "./errors.ts";

type HonoDecoratorContext = ClassDecoratorContext | ClassMethodDecoratorContext | ClassFieldDecoratorContext;

export type HonoDecoratorFactory<Args extends any[], Target, Ctx extends HonoDecoratorContext> = (
  ...args: Args
) => (input: Target, context: Ctx) => void;

export type ControllerDecoratorContext<
  Meta = any,
  Target extends abstract new (...args: any) => any = abstract new (...args: any) => any,
> = Pick<ClassDecoratorContext, "kind" | "name"> & {
  target: Target;
  metadata?: Meta;
  metadataMap: Map<any, any>;
};
export type EndpointDecoratorContext<Meta = any> =
  & Pick<
    ClassMethodDecoratorContext | ClassFieldDecoratorContext,
    "kind" | "name" | "private" | "static"
  >
  & {
    target: undefined;
    metadata?: Meta;
    metadataMap: Map<any, any>;
  };

export type MetadataDecoratorHandler<
  Meta,
  Args extends any[] = any[],
  Ctx extends ControllerDecoratorContext<Meta> | EndpointDecoratorContext<Meta> =
    | ControllerDecoratorContext<Meta>
    | EndpointDecoratorContext<Meta>,
> = (args: Args, ctx: Ctx) => Meta | undefined;

export function createMetadataDecoratorFactory<
  Meta,
  Args extends any[],
  Target = any,
  Ctx extends HonoDecoratorContext = HonoDecoratorContext,
>(
  handler: MetadataDecoratorHandler<Meta, Args, ControllerDecoratorContext<Meta> | EndpointDecoratorContext<Meta>>,
): HonoDecoratorFactory<Args, Target, Ctx> {
  return function MetadataDecoratorFactory(...args: Args) {
    return function MetadataDecorator(input: unknown, ctx: HonoDecoratorContext) {
      const key = MetadataDecoratorFactory;
      const controllerMeta = privateControllerMeta.getMetadata(ctx.metadata);
      if (!controllerMeta) throw new DecorateNotEndpointError();
      let metadataMap: Map<any, any>;
      if (ctx.kind === "class") {
        metadataMap = controllerMeta.metadata;
      } else {
        const property = controllerMeta.fieldMetadataMap.get(ctx.name);
        if (!property) throw new DecorateNotEndpointError();
        metadataMap = property;
      }

      const oldValue = metadataMap.get(key) as Meta | undefined;
      let newValue: any;
      if (ctx.kind === "class") {
        newValue = handler(args, {
          kind: ctx.kind,
          name: ctx.name,
          metadata: oldValue,
          target: input as any,
          metadataMap,
        });
      } else {
        newValue = handler(args, {
          kind: ctx.kind,
          name: ctx.name,
          metadata: oldValue,
          private: ctx.private,
          static: ctx.static,
          target: undefined,
          metadataMap,
        });
      }
      if (newValue !== undefined) metadataMap.set(key, newValue);
    };
  };
}
