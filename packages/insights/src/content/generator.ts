/**
 * AI content generation for insights
 *
 * Runs on the platform generation capability through the Pramaan client:
 * - Title: Concise headline (10-20 words)
 * - Summary: Complete financial picture (40-60 words)
 * - Story: Forward-looking or actionable insight (max 15 words)
 * - Actions: Specific actionable items with exact names/amounts
 */
import {
  INSIGHT_ACTIONS_SCHEMA,
} from "@business-operations/pramaan/schemas";
import { pramaanFromEnv } from "@business-operations/pramaan";
import { createLoggerWithContext } from "@business-operations/logger";

const logger = createLoggerWithContext("insights:generator");

import type {
  ExpenseAnomaly,
  InsightActivity,
  InsightAnomaly,
  InsightContent,
  InsightMetric,
  InsightPredictions,
  MomentumContext,
  PeriodType,
  PreviousPredictionsContext,
} from "../types";
import { getFallbackContent } from "./prompts";
import {
  buildActionsPrompt,
  buildStoryPrompt,
  buildSummaryPrompt,
  buildTitlePrompt,
  computeSlots,
} from "./prompts/index";

export type ContentGeneratorOptions = {
  /** Ignored: the platform chooses the model. Kept for caller compatibility. */
  model?: string;
};

/**
 * Year-over-year comparison data
 */
export type YearOverYearContext = {
  lastYearRevenue: number;
  lastYearProfit: number;
  revenueChangePercent: number;
  profitChangePercent: number;
  hasComparison: boolean;
};

/**
 * Revenue concentration data
 */
export type RevenueConcentrationContext = {
  topCustomer: { name: string; revenue: number; percentage: number } | null;
  isConcentrated: boolean;
};

/**
 * Quarter pace projection data
 */
export type QuarterPaceContext = {
  currentQuarter: number;
  qtdRevenue: number;
  projectedRevenue: number;
  lastYearQuarterRevenue: number;
  vsLastYearPercent: number;
  hasComparison: boolean;
};

/**
 * Additional context for content generation (momentum, predictions, etc.)
 */
export type ContentGenerationContext = {
  momentumContext?: MomentumContext;
  previousPredictions?: PreviousPredictionsContext;
  predictions?: InsightPredictions;
  yearOverYear?: YearOverYearContext;
  quarterPace?: QuarterPaceContext;
  runwayMonths?: number;
  periodEnd?: Date; // End of insight period, for calculating dates relative to period
  locale?: string;
  weeksOfHistory?: number;
  revenueConcentration?: RevenueConcentrationContext;
  /** All computed metrics (for activity metric change descriptions) */
  allMetrics?: Record<string, InsightMetric>;
};

/**
 * Content generator class for creating AI-powered insight summaries
 *
 * Uses split prompts for maximum quality:
 * 1. Title + Summary generated in parallel (both only need slots)
 * 2. Story generated after (needs title/summary context)
 * 3. Actions generated in parallel with story (only needs slots)
 */
export class ContentGenerator {
  constructor(options: ContentGeneratorOptions = {}) {
    // options.model is accepted for caller compatibility and ignored
    void options;
  }

  /**
   * Generate insight content using split focused prompts
   */
  async generate(
    selectedMetrics: InsightMetric[],
    anomalies: InsightAnomaly[],
    activity: InsightActivity,
    periodLabel: string,
    periodType: PeriodType,
    currency: string,
    expenseAnomalies: ExpenseAnomaly[] = [],
    context: ContentGenerationContext = {},
  ): Promise<InsightContent> {
    const startTime = Date.now();

    try {
      // 1. Compute all slots (exact values for AI to use)
      const slots = computeSlots(
        selectedMetrics,
        activity,
        currency,
        periodLabel,
        periodType,
        {
          momentumContext: context.momentumContext,
          yearOverYear: context.yearOverYear,
          quarterPace: context.quarterPace,
          runwayMonths: context.runwayMonths,
          periodEnd: context.periodEnd,
          weeksOfHistory: context.weeksOfHistory,
          expenseAnomalies,
          revenueConcentration: context.revenueConcentration,
          anomalies,
          allMetrics: context.allMetrics,
          predictions: context.predictions,
        },
      );

      logger.debug("Slots computed", {
        weekType: slots.weekType,
        profit: slots.profitRaw,
        revenue: slots.revenueRaw,
        expenses: slots.expensesRaw,
        isFirstInsight: slots.isFirstInsight,
      });

      // 2. Generate title, summary, and actions in parallel
      const [title, summary, actions] = await Promise.all([
        this.generateTitle(slots),
        this.generateSummary(slots),
        this.generateActions(slots),
      ]);

      // 3. Generate story
      const story = await this.generateStory(slots);

      const duration = Date.now() - startTime;
      logger.info("Content generated", {
        durationMs: duration,
        actionsCount: actions.length,
      });

      return { title, summary, story, actions };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("Failed to generate AI content", {
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs: duration,
        periodLabel,
      });

      // Return fallback content with activity for context
      return getFallbackContent(periodLabel, periodType, activity);
    }
  }

  /**
   * Run one plain text generation through the Pramaan client
   */
  async #generateText(prompt: string): Promise<string> {
    const pramaan = pramaanFromEnv();
    if (!pramaan) {
      throw new Error("Generation is not available");
    }

    const result = await pramaan.llmChat({
      messages: [{ role: "user", content: prompt }],
      maxTokens: 256,
    });

    return result.text?.trim() ?? "";
  }

  /**
   * Generate title using focused prompt
   */
  private async generateTitle(
    slots: ReturnType<typeof computeSlots>,
  ): Promise<string> {
    const prompt = buildTitlePrompt(slots);

    return this.#generateText(prompt);
  }

  /**
   * Generate summary using focused prompt
   */
  private async generateSummary(
    slots: ReturnType<typeof computeSlots>,
  ): Promise<string> {
    const prompt = buildSummaryPrompt(slots);

    return this.#generateText(prompt);
  }

  /**
   * Generate story using focused prompt
   */
  private async generateStory(
    slots: ReturnType<typeof computeSlots>,
  ): Promise<string> {
    const prompt = buildStoryPrompt(slots);

    const text = await this.#generateText(prompt);

    // Strip quotes and clean up
    return text.replace(/^["']|["']$/g, "");
  }

  /**
   * Generate actions using structured output
   */
  private async generateActions(
    slots: ReturnType<typeof computeSlots>,
  ): Promise<
    Array<{
      text: string;
      type?: string;
      entityType?: "invoice" | "project" | "customer" | "transaction";
      entityId?: string;
    }>
  > {
    const prompt = buildActionsPrompt(slots);

    // No actionable data
    if (!prompt) {
      return [];
    }

    const pramaan = pramaanFromEnv();
    if (!pramaan) {
      throw new Error("Generation is not available");
    }

    const result = await pramaan.llmComplete({
      messages: [{ role: "user", content: prompt }],
      maxTokens: 256,
      jsonSchema: INSIGHT_ACTIONS_SCHEMA,
    });

    const parsed = JSON.parse(result.text ?? "{}") as {
      actions?: Array<{ text?: string }>;
    };

    // Enrich actions with deep links based on slot data
    return (parsed.actions ?? [])
      .filter((action): action is { text: string } =>
        Boolean(typeof action.text === "string" && action.text.trim()),
      )
      .map((action) => this.enrichActionWithEntity(action.text, slots));
  }

  /**
   * Match action text to slot data and add entity ID for client-side sheet opening
   */
  private enrichActionWithEntity(
    text: string,
    slots: ReturnType<typeof computeSlots>,
  ): {
    text: string;
    type?: string;
    entityType?: "invoice" | "project" | "customer" | "transaction";
    entityId?: string;
  } {
    const textLower = text.toLowerCase();

    // Check overdue invoices
    for (const inv of slots.overdue) {
      if (textLower.includes(inv.company.toLowerCase())) {
        return {
          text,
          type: "overdue",
          entityType: "invoice",
          entityId: inv.id,
        };
      }
    }

    // Check drafts
    for (const draft of slots.drafts) {
      if (textLower.includes(draft.company.toLowerCase())) {
        return {
          text,
          type: "draft",
          entityType: "invoice",
          entityId: draft.id,
        };
      }
    }

    // No match - return as is
    return { text };
  }
}

/**
 * Create a content generator instance
 */
export function createContentGenerator(
  options?: ContentGeneratorOptions,
): ContentGenerator {
  return new ContentGenerator(options);
}
