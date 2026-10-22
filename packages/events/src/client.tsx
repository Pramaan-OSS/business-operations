"use client";
/** Compatibility for event annotations; no event data leaves this installation. */
export function Provider() { return null; }
export function useEvents() { return { track: (..._args: unknown[]) => undefined }; }
export function track(..._args: unknown[]) { return undefined; }
