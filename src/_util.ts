export function getObjectClass(object: object): unknown {
  const proto = Reflect.getPrototypeOf(object);
  if (!proto) return;
  return getPrototypeConstructor(proto);
}
export function getPrototypeConstructor(proto: object) {
  return Reflect.get(proto, "constructor");
}
export function getParentClass(Class: Function): Function | undefined {
  const proto = Reflect.getPrototypeOf(Class.prototype);
  if (proto) return Reflect.get(proto, "constructor");
}
