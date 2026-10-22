import { getObject, putObject } from "@business-operations/storage";
export async function logoExists(key: string): Promise<boolean> {
  return Boolean(await getObject({ bucket: "logos", path: key }));
}
export async function uploadLogo(key: string, data: Buffer | Uint8Array, _contentType: string): Promise<void> {
  await putObject({ bucket: "logos", path: key, data });
}
