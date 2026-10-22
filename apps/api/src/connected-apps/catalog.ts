import { ConnectedApps } from "@business-operations/storage/connected-apps";
export type CatalogEntry = { slug: string; name: string; logo: string | null; description: string | null };
export async function getCatalog(): Promise<CatalogEntry[]> {
  const rows = await new ConnectedApps().catalog();
  return [...new Map(rows.map(row => [row.app, { slug: row.app, name: row.app, logo: null, description: row.description || null }])).values()];
}
