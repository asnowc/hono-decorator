export class DecoratorKindError extends Error {
  constructor(expectKind: string, actualKind: string) {
    super(
      `The current decorator can only decorate targets of type ${expectKind} and cannot decorate targets of type ${actualKind}`,
    );
  }
}
export class DecoratePrivatePropertyError extends Error {
  constructor() {
    super("Endpoint decorator cannot decorate private properties or methods");
  }
}
export class DecorateNotEndpointError extends Error {
  constructor() {
    super("The target does not have an Endpoint decorator applied");
  }
}
export class DecorateReuseError extends Error {
  constructor(decorateName: string = "The decorator") {
    super(decorateName + " cannot be applied to the same target more than once");
  }
}
