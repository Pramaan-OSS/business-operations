/** Missing public records should render the page's not-found state. */
export async function readPublicRecord<T>(read: () => Promise<T>): Promise<T | null> {
  try { return await read(); }
  catch (error) {
    if (error && typeof error === "object" && "data" in error &&
        (error.data as { code?: string } | null)?.code === "NOT_FOUND") return null;
    throw error;
  }
}
