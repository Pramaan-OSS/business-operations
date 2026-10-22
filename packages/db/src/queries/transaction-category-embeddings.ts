import { eq, sql } from "drizzle-orm";
import type { Database } from "../client";
import { transactionCategoryEmbeddings } from "../schema";

export type GetCategoryEmbeddingParams = {
  name: string;
};

export const getCategoryEmbedding = async (
  db: Database,
  params: GetCategoryEmbeddingParams,
) => {
  const { name } = params;

  const [result] = await db
    .select()
    .from(transactionCategoryEmbeddings)
    .where(eq(transactionCategoryEmbeddings.name, name))
    .limit(1);

  return result;
};

export type CreateCategoryEmbeddingParams = {
  name: string;
  embedding: number[];
  system?: boolean;
  model?: string;
  space?: string;
};

export const createCategoryEmbedding = async (
  db: Database,
  params: CreateCategoryEmbeddingParams,
) => {
  const {
    name,
    embedding,
    system = false,
    model = "unconfigured",
    space,
  } = params;

  const [result] = await db
    .insert(transactionCategoryEmbeddings)
    .values({
      name,
      embedding,
      system,
      model,
      space,
    })
    .returning();

  return result;
};

export type UpsertCategoryEmbeddingParams = {
  name: string;
  embedding: number[];
  system?: boolean;
  model?: string;
  space?: string;
};

export const upsertCategoryEmbedding = async (
  db: Database,
  params: UpsertCategoryEmbeddingParams,
) => {
  const {
    name,
    embedding,
    system = false,
    model = "unconfigured",
    space,
  } = params;

  const [result] = await db
    .insert(transactionCategoryEmbeddings)
    .values({
      name,
      embedding,
      system,
      model,
      space,
    })
    .onConflictDoUpdate({
      target: transactionCategoryEmbeddings.name,
      set: {
        embedding,
        model,
        space,
        updatedAt: sql`NOW()`,
      },
    })
    .returning();

  return result;
};
