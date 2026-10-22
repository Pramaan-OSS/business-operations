/** Event annotations have no external collector. */
export async function setupAnalytics() { return { track: (..._args: unknown[]) => undefined }; }
