export interface EndpointMeta {
  readonly path: string;
  readonly method?: string;
  readonly key: number | string | symbol;
}
export interface ControllerMeta {
  path?: string;
  extends?: boolean;
  readonly metadata: Map<any, any>;
  /** endpointKey (method+path) -> endpointMeta */
  readonly endpoints: Map<string, EndpointMeta>;
  /** controllerKey -> fieldMetadata */
  readonly fieldMetadataMap: Map<number | string | symbol, Map<any, any>>;
}
