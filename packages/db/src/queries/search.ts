import { sql, type SQL } from "drizzle-orm";
import type { Database } from "../client";

export type GlobalSearchReturnType = {
  id: string;
  type: string;
  title: string;
  relevance: number;
  created_at: string;
  data: any;
};

export type GlobalSemanticSearchParams = {
  teamId: string;
  searchTerm: string;
  itemsPerTableLimit: number;
  language?: string;
  types?: string[];
  amount?: number;
  amountMin?: number;
  amountMax?: number;
  status?: string;
  currency?: string;
  startDate?: string;
  endDate?: string;
  dueDateStart?: string;
  dueDateEnd?: string;
};

const sources = [
  ["transactions", "transaction", "name"], ["invoices", "invoice", "invoice_number"],
  ["customers", "customer", "name"], ["documents", "vault", "title"],
  ["inbox", "inbox", "display_name"], ["tracker_projects", "tracker_project", "name"],
] as const;
async function searchLocal(db: Database, params: GlobalSemanticSearchParams & { limit?: number; relevanceThreshold?: number }) {
  const term = params.searchTerm?.trim() || "";
  const wanted = sources.filter(([table, type]) => !params.types?.length || params.types.includes(table) || params.types.includes(type));
  if (!wanted.length) return [];
  const rows = sql.join(wanted.map(([table, type, title]) => sql`
    SELECT id::text, ${type}::text AS type, COALESCE(to_jsonb(s)->>${title}, to_jsonb(s)->>'name', to_jsonb(s)->>'file_name', ${type}) AS title,
      created_at::text, to_jsonb(s) AS data FROM ${sql.raw(table)} s WHERE s.team_id = ${params.teamId}::uuid
  `), sql` UNION ALL `);
  const filters: SQL[] = [];
  if (params.currency) filters.push(sql`data->>'currency' = ${params.currency.toUpperCase()}`);
  if (params.status) filters.push(sql`data->>'status' = ${params.status}`);
  if (params.amount !== undefined) filters.push(sql`abs(NULLIF(data->>'amount', '')::numeric) = abs(${params.amount}::numeric)`);
  if (params.amountMin !== undefined) filters.push(sql`abs(NULLIF(data->>'amount', '')::numeric) >= ${params.amountMin}::numeric`);
  if (params.amountMax !== undefined) filters.push(sql`abs(NULLIF(data->>'amount', '')::numeric) <= ${params.amountMax}::numeric`);
  if (params.startDate) filters.push(sql`COALESCE(data->>'date', created_at)::timestamptz >= ${params.startDate}::timestamptz`);
  if (params.endDate) filters.push(sql`COALESCE(data->>'date', created_at)::timestamptz < ${params.endDate}::date + interval '1 day'`);
  if (params.dueDateStart) filters.push(sql`(data->>'due_date')::timestamptz >= ${params.dueDateStart}::timestamptz`);
  if (params.dueDateEnd) filters.push(sql`(data->>'due_date')::timestamptz < ${params.dueDateEnd}::date + interval '1 day'`);
  const where = filters.length ? sql`AND ${sql.join(filters, sql` AND `)}` : sql``;
  return db.executeOnReplica(sql`
    WITH owned AS (${rows}), content AS (
      SELECT *, concat_ws(' ', title, data->>'description', data->>'note', data->>'email', data->>'body', data->>'merchant_name', data->>'file_name', data->'line_items') AS text FROM owned
    ), scored AS (
      SELECT *, CASE WHEN ${term} = '' THEN 0 ELSE ts_rank_cd(to_tsvector('simple', text), websearch_to_tsquery('simple', ${term})) END AS relevance FROM content
    ), ranked AS (
      SELECT *, row_number() OVER (PARTITION BY type ORDER BY relevance DESC, created_at DESC, id) AS position FROM scored
      WHERE (${term} = '' OR relevance >= ${params.relevanceThreshold ?? 0.01} OR strpos(lower(text), lower(${term})) > 0) ${where}
    ) SELECT id, type, title, relevance::float8, created_at, data FROM ranked
      WHERE position <= ${Math.min(100, Math.max(1, params.itemsPerTableLimit))}
      ORDER BY relevance DESC, created_at DESC, id LIMIT ${Math.min(1000, Math.max(1, params.limit ?? params.itemsPerTableLimit * wanted.length))}
  `) as Promise<GlobalSearchReturnType[]>;
}
export function globalSemanticSearchQuery(db: Database, params: GlobalSemanticSearchParams) { return searchLocal(db, params); }
type GlobalSearchParams = { teamId: string; searchTerm?: string; limit?: number; itemsPerTableLimit?: number; language?: string; relevanceThreshold?: number };
export function globalSearchQuery(db: Database, params: GlobalSearchParams) {
 return searchLocal(db, { ...params, searchTerm: params.searchTerm || "", itemsPerTableLimit: params.itemsPerTableLimit ?? 5 });
}
