import { EndpointDecorator } from "@asla/hono-decorator";

declare const endpointDecorator: EndpointDecorator;

//@ts-expect-error EndpointDecorator 只能装饰函数
@endpointDecorator
class EndpointDecoratorTest {
  @endpointDecorator
  method(ctx: number): string {
    return "abc";
  }
  @endpointDecorator
  async asyncMethod(ctx: number): Promise<string> {
    return "abc";
  }

  @endpointDecorator
  method2 = () => {};

  //@ts-expect-error EndpointDecorator 只能装饰函数
  @endpointDecorator
  attr1 = 9;

  //@ts-expect-error EndpointDecorator 不能装饰访问器
  @endpointDecorator
  get getter(): any {
    return;
  }
  //@ts-expect-error EndpointDecorator 不能装饰访问器
  @endpointDecorator
  set setter(value: any) {}

  //@ts-expect-error EndpointDecorator 不能装饰访问器
  @endpointDecorator
  accessor abc: any;
}

declare const customEndpointDecorator: EndpointDecorator<(arg: number) => string>;

class CustomEndpointDecoratorTest {
  @customEndpointDecorator
  method1(arg1: number): string {
    throw "";
  }
  //@ts-expect-error customEndpointDecorator 限制了装饰类型
  @customEndpointDecorator
  method2(arg1: number): number {
    throw "";
  }
  //@ts-expect-error customEndpointDecorator 限制了装饰类型
  @customEndpointDecorator
  method3(arg1: string): string {
    throw "";
  }
}
