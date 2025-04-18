//@ts-ignore Support ES2023
if (!Symbol.metadata) {
  Reflect.set(Symbol, "metadata", Symbol("Symbol.metadata"));
}
//@ts-ignore Support ES2023
const SymbolMetadata = Symbol.metadata;

export class PrivateMetaDataManage<V> {
  #map = new WeakMap<object, V>();
  getMetadata(meta: MetaKey) {
    //@ts-ignore It should be an object
    return this.#map.get(meta);
  }
  set(key: MetaKey, value: V) {
    //@ts-ignore It should be an object
    this.#map.set(key, value);
  }
  getClassMetadata(Class: Function) {
    const metadata = Reflect.get(Class, SymbolMetadata);
    if (metadata) return this.#map.get(metadata);
    return;
  }
}
export type MetaKey = object | undefined;
