export function getLogoURL(name: string, _ext?: string) {
  return `/api/logo?name=${encodeURIComponent(name)}`;
}
export function getFileExtension(url: string) {
  return url.split(".").at(-1);
}
