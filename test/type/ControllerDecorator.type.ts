import { ControllerDecorator } from "@asla/hono-decorator";

declare const controllerDecorator: ControllerDecorator;

@controllerDecorator
class ControllerDecoratorTest {
  //@ts-expect-error ControllerDecorator 只能装饰类
  @controllerDecorator
  attr1: any;

  //@ts-expect-error ControllerDecorator 只能装饰类
  @controllerDecorator
  get getter(): any {
    return;
  }
  //@ts-expect-error ControllerDecorator 只能装饰类
  @controllerDecorator
  set setter(value: any) {}

  //@ts-expect-error ControllerDecorator 只能装饰类
  @controllerDecorator
  accessor abc: any;
}

declare const customControllerDecorator: ControllerDecorator<new () => Test1>;

@customControllerDecorator
class Test1 {
  constructor() {}
  method() {}
}

//@ts-expect-error
@customControllerDecorator
class Test2 {
  constructor() {}
}
