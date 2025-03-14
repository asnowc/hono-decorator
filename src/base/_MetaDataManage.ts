declare global {
  interface SymbolConstructor {
    readonly metadata: unique symbol;
  }
}

if (!Symbol.metadata) {
  Reflect.set(Symbol, "metadata", Symbol("Symbol.metadata"));
}
const SymbolMetadata = Symbol.metadata;

export class PrivateMetaDataManage<V> {
  #map = new WeakMap<object, V>();
  getMetadata(meta: object) {
    return this.#map.get(meta);
  }
  set(key: object, value: V) {
    this.#map.set(key, value);
  }
  getClassMetadata(Class: Function) {
    const metadata = Reflect.get(Class, SymbolMetadata);
    if (metadata) return this.#map.get(metadata);
    return;
  }
}
