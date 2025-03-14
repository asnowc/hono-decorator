import { Context, HonoRequest } from "hono";
import { Get, PipeInput, PipeOutput } from "@asla/hono-decorator";

class Controller {
  @Get("/test1")
  method1(ctx: Context) {} //If the ToArguments decorator is not applied, the first argument is passed to Context

  //@ts-expect-error The return type of the parameter converter is inconsistent with the routing processor's parameters
  @PipeInput(function (ctx: Context) {
    return [1, "abc"];
  })
  @Get("/argumentsWrong")
  wrongToArguments(arg1: string) {}

  @PipeInput(
    function (ctx: Context) {
      //The returned type is the same as the parameter for method2
      // If types are inconsistent, typescript prompts an exception
      return "23";
    },
    function (i) {
      return parseInt(i);
    },
  )
  //The type of data is the same as that returned by method2
  // If types are inconsistent, typescript prompts an exception
  @PipeOutput((data, ctx: Context) => {
    data.body; // string
    data.title; // string

    //@ts-expect-error content not exist
    data.content;

    return ctx.text("ok");
  })
  @Get("/test2")
  method2(size: number) {
    return {
      title: "123",
      body: "abc",
    };
  }
}
