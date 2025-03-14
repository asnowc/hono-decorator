import { DecorateNotEndpointError, DecoratorKindError } from "./errors.ts";
import { createInitDecorateMeta, isController, privateControllerMeta } from "./_metadata.ts";
import { getParentClass } from "../_util.ts";

export { isController };
export type ControllerDecoratorTarget = new (...args: any[]) => any;

/**
 * @typeParam T Types of decoration targets constrained by constraints
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
export function Controller(option: ControllerOption): ControllerDecorator {
  return function (input: ControllerDecoratorTarget, ctx: ClassDecoratorContext) {
    if (ctx.kind !== "class") throw new DecoratorKindError("class", ctx.kind);

    const meta = ctx.metadata;

    let controllerMeta = privateControllerMeta.getMetadata(meta);
    if (!controllerMeta) {
      if (option.extends && isController(getParentClass(input))) {
        controllerMeta = createInitDecorateMeta();
        privateControllerMeta.set(meta, controllerMeta);
      } else throw new DecorateNotEndpointError();
    }

    if (typeof option.basePath === "string") controllerMeta.path = option.basePath;
    if (option.extends !== undefined) controllerMeta.extends = Boolean(option.extends);
  };
}
