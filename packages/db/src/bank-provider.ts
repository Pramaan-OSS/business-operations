/** Old stored connections remain visible, but cannot be reused through the new bank path. */
export function bankProviderView(value: string | null | undefined): "pramaan" | "legacy" {
  return value === "pramaan" ? "pramaan" : "legacy";
}
