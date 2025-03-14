import type { Context } from "hono";
import type { EndpointDecorator } from "./Endpoint.ts";
import { createMetadataDecoratorFactory } from "./factory.ts";
import { DecorateReuseError } from "./errors.ts";

export type DataTransformer<Input, Output> = (input: Input) => Output;

export type ResponseTransformer<T> = (result: T, ctx: Context) => Response | Promise<Response>;

export type TransformerDecorator<T extends (...args: any) => any = (...args: any) => any> = (
  input: T | (abstract new (...args: any) => any) | undefined,
  context: ClassMethodDecoratorContext<unknown, T> | ClassFieldDecoratorContext<unknown, T> | ClassDecoratorContext,
) => void;

interface ResTransformDecoratorFactory {
  <T>(handler: ResponseTransformer<Awaited<T>>): TransformerDecorator<(...args: any[]) => T | Promise<T>>;
}

export const ToResponse: ResTransformDecoratorFactory = createMetadataDecoratorFactory<
  Function,
  [ResponseTransformer<any>]
>(function (args, { metadata, kind }) {
  if (metadata) throw new DecorateReuseError("PipeOutput");
  const handler = args[0];
  if (typeof handler !== "function") throw new Error("handler must be a function");
  return handler;
});
export function PipeOutput<T>(
  handler: ResponseTransformer<Awaited<T>>,
): EndpointDecorator<(...args: any[]) => T | Promise<T>>;
export function PipeOutput<R0, R1>(
  pipe: DataTransformer<Awaited<R0>, R1>,
  handler: ResponseTransformer<Awaited<R1>>,
): EndpointDecorator<(...args: any[]) => R0 | Promise<R0>>;
export function PipeOutput<R0, R1, R2>(
  pipe1: DataTransformer<Awaited<R0>, R1>,
  pipe2: DataTransformer<Awaited<R1>, R2>,
  handler: ResponseTransformer<Awaited<R2>>,
): EndpointDecorator<(...args: any[]) => R0 | Promise<R0>>;
export function PipeOutput<
  R0,
  ResFinal,
  Pipes extends [
    DataTransformer<R0, any>,
    ...pipes: DataTransformer<any, any>[],
    handler: ResponseTransformer<ResFinal>,
  ],
>(...pipes: Pipes): EndpointDecorator<(...args: any[]) => R0 | Promise<R0>>;
export function PipeOutput(...handlers: any[]) {
  if (handlers.length === 1) return ToResponse(handlers[0]);
  const finalHandler = handlers.pop();
  return ToResponse(function (result, ctx) {
    result = useTransformers(handlers, result);
    if (result instanceof Promise) return result.then((r) => finalHandler(r, ctx));
    else return finalHandler(result, ctx);
  });
}

export type RequestTransformer<Args, Input = unknown> = (input: Input) => Args | Promise<Args>;

interface ReqTransformDecoratorFactory {
  <Args extends any[]>(handler: RequestTransformer<Args, Context>): TransformerDecorator<(...data: Args) => any>;
}

export const ToArguments: ReqTransformDecoratorFactory = createMetadataDecoratorFactory<
  Function,
  [RequestTransformer<any[], Context>]
>(function (args, { metadata, kind }) {
  if (metadata) throw new DecorateReuseError("PipeInput");
  const handler = args[0];
  if (typeof handler !== "function") throw new Error("handler must be a function");
  return handler;
});
export function PipeInput<Args>(handler: RequestTransformer<Args, Context>): EndpointDecorator<(data: Args) => any>;
export function PipeInput<P0, P1>(
  pipe: DataTransformer<Context, P1>,
  handler: RequestTransformer<P0, Awaited<P1>>,
): EndpointDecorator<(data: P0) => any>;
export function PipeInput<P0, P1, P2>(
  pipe1: DataTransformer<Context, P1>,
  pipe2: DataTransformer<Awaited<P1>, P2>,
  handler: RequestTransformer<P0, Awaited<P2>>,
): EndpointDecorator<(data: P0) => any>;
export function PipeInput<
  P0,
  Pipes extends [
    pipe1: DataTransformer<Context, any>,
    ...args: DataTransformer<any, any>[],
    handler: RequestTransformer<P0, any>,
  ],
>(...transformers: Pipes): EndpointDecorator<(data: P0) => any>;
export function PipeInput(...handlers: any[]): EndpointDecorator<(...data: any[]) => any> {
  return ToArguments(function (ctx) {
    const result = useTransformers(handlers, ctx);
    if (result instanceof Promise) return result.then((args) => [args]);
    else return [result];
  });
}
function useTransformers(transformers: DataTransformer<any, any>[], arg: any) {
  let i = 0;
  for (; !(arg instanceof Promise) && i < transformers.length; i++) {
    let transformer = transformers[i];
    arg = transformer(arg);
  }
  if (arg instanceof Promise) {
    for (; i < transformers.length; i++) {
      let transformer = transformers[i];
      arg = arg.then(transformer);
    }
  }
  return arg;
}
