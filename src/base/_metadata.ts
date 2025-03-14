import { PrivateMetaDataManage } from "./_MetaDataManage.ts";
import type { ControllerMeta } from "./_type.ts";

export const privateControllerMeta = new PrivateMetaDataManage<ControllerMeta>();

export function createInitDecorateMeta(): ControllerMeta {
  return { endpoints: new Map(), fieldMetadataMap: new Map(), metadata: new Map() };
}

export function isController(Class: any) {
  return !!privateControllerMeta.getClassMetadata(Class);
}
