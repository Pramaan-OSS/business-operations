import { requirePramaan, unavailableMessage, type Caps } from "@business-operations/pramaan";
import { z } from "zod";
import {
  deleteCustomerSchema,
  enrichCustomerSchema,
  getCustomerByIdSchema,
  getCustomerByPortalIdSchema,
  getCustomerInvoiceSummarySchema,
  getCustomersSchema,
  getPortalInvoicesSchema,
  toggleCustomerPortalSchema,
  upsertCustomerSchema,
} from "@api/schemas/customers";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@api/trpc/init";
import {
  clearCustomerEnrichment,
  deleteCustomer,
  getCustomerById,
  getCustomerByPortalId,
  getCustomerInvoiceSummary,
  getCustomerPortalInvoices,
  getCustomers,
  toggleCustomerPortal,
  updateCustomerEnrichmentStatus,
  upsertCustomer,
} from "@business-operations/db/queries";
import { triggerJob } from "@business-operations/job-client";
import { createLoggerWithContext } from "@business-operations/logger";
import { TRPCError } from "@trpc/server";

const logger = createLoggerWithContext("trpc:customers");

export const customersRouter = createTRPCRouter({
  addressSuggestions: protectedProcedure.input(z.object({ countryCode: z.string().regex(/^[A-Z]{2}$/), text: z.string().min(1).max(32) })).mutation(async ({ input }) => {
    try { return await requirePramaan().geoAddressSuggest({ ...input, limit: 10 }); }
    catch (error) { throw new TRPCError({ code: "PRECONDITION_FAILED", message: unavailableMessage(error) }); }
  }),
  addressDetails: protectedProcedure.input(z.object({ query: z.string().min(1).max(2048), countryCode: z.string().regex(/^[A-Z]{2}$/) })).mutation(async ({ input }) => {
    try { return await requirePramaan().call("geo.address.geocode-detailed", { query: input.query, region: input.countryCode, limit: 5 }) as Caps.GeoAddressDetailedResult; }
    catch (error) { throw new TRPCError({ code: "PRECONDITION_FAILED", message: unavailableMessage(error) }); }
  }),

  validateVatNumber: protectedProcedure.input(z.object({ vatNumber: z.string().min(1).max(512) }))
    .query(async ({ input }) => {
      const result = await requirePramaan().financeVatNumberValidate(input) as { valid?: boolean; companyName?: string; vatNumber?: string };
      if (typeof result.valid !== "boolean") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "VAT validation is not available yet." });
      return { valid: result.valid, companyName: result.companyName, vatNumber: result.vatNumber };
    }),
  get: protectedProcedure
    .input(getCustomersSchema.optional())
    .query(async ({ ctx: { teamId, db }, input }) => {
      return getCustomers(db, {
        teamId: teamId!,
        ...input,
      });
    }),

  getById: protectedProcedure
    .input(getCustomerByIdSchema)
    .query(async ({ ctx: { db, teamId }, input }) => {
      return getCustomerById(db, {
        id: input.id,
        teamId: teamId!,
      });
    }),

  delete: protectedProcedure
    .input(deleteCustomerSchema)
    .mutation(async ({ ctx: { db, teamId }, input }) => {
      return deleteCustomer(db, {
        id: input.id,
        teamId: teamId!,
      });
    }),

  upsert: protectedProcedure
    .input(upsertCustomerSchema)
    .mutation(async ({ ctx: { db, teamId, session }, input }) => {
      const isNewCustomer = !input.id;

      const customer = await upsertCustomer(db, {
        ...input,
        teamId: teamId!,
        userId: session.user.id,
      });

      // Auto-trigger enrichment for new customers with a website or email
      if (
        isNewCustomer &&
        (customer?.website || customer?.email) &&
        customer?.id
      ) {
        try {
          // Set status to pending first, then trigger job
          await updateCustomerEnrichmentStatus(db, {
            customerId: customer.id,
            status: "pending",
          });

          await triggerJob(
            "enrich-customer",
            {
              customerId: customer.id,
              teamId: teamId!,
            },
            "customers",
            { attempts: 1 },
          );
        } catch (error) {
          // Log but don't fail the customer creation
          logger.error("Failed to trigger customer enrichment", {
            error: error instanceof Error ? error.message : String(error),
          });
          // Reset status since job wasn't queued
          await updateCustomerEnrichmentStatus(db, {
            customerId: customer.id,
            status: null,
          }).catch(() => {}); // Ignore errors on cleanup
        }
      }

      return customer;
    }),

  getInvoiceSummary: protectedProcedure
    .input(getCustomerInvoiceSummarySchema)
    .query(async ({ ctx: { db, teamId }, input }) => {
      return getCustomerInvoiceSummary(db, {
        customerId: input.id,
        teamId: teamId!,
      });
    }),

  enrich: protectedProcedure
    .input(enrichCustomerSchema)
    .mutation(async ({ ctx: { db, teamId }, input }) => {
      const customer = await getCustomerById(db, {
        id: input.id,
        teamId: teamId!,
      });

      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      if (!customer.website && !customer.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Customer has no website or email - enrichment requires at least one",
        });
      }

      // Set status to pending first, then trigger job
      await updateCustomerEnrichmentStatus(db, {
        customerId: customer.id,
        status: "pending",
      });

      await triggerJob(
        "enrich-customer",
        {
          customerId: customer.id,
          teamId: teamId!,
        },
        "customers",
        { attempts: 1 },
      );

      return { queued: true };
    }),

  cancelEnrichment: protectedProcedure
    .input(enrichCustomerSchema)
    .mutation(async ({ ctx: { db, teamId }, input }) => {
      const customer = await getCustomerById(db, {
        id: input.id,
        teamId: teamId!,
      });

      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      // Reset status to null (no enrichment in progress)
      // The job may still complete in background but UI won't show as processing
      await updateCustomerEnrichmentStatus(db, {
        customerId: customer.id,
        status: null,
      });

      return { cancelled: true };
    }),

  clearEnrichment: protectedProcedure
    .input(enrichCustomerSchema)
    .mutation(async ({ ctx: { db, teamId }, input }) => {
      const customer = await getCustomerById(db, {
        id: input.id,
        teamId: teamId!,
      });

      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      await clearCustomerEnrichment(db, {
        customerId: customer.id,
        teamId: teamId!,
      });

      return { cleared: true };
    }),

  togglePortal: protectedProcedure
    .input(toggleCustomerPortalSchema)
    .mutation(async ({ ctx: { db, teamId }, input }) => {
      return toggleCustomerPortal(db, {
        customerId: input.customerId,
        teamId: teamId!,
        enabled: input.enabled,
      });
    }),

  getByPortalId: publicProcedure
    .input(getCustomerByPortalIdSchema)
    .query(async ({ ctx: { db }, input }) => {
      const customer = await getCustomerByPortalId(db, {
        portalId: input.portalId,
      });

      if (!customer) {
        return null;
      }

      // Get invoice summary
      const summary = await getCustomerInvoiceSummary(db, {
        customerId: customer.id,
        teamId: customer.teamId,
      });

      return {
        customer,
        summary,
      };
    }),

  getPortalInvoices: publicProcedure
    .input(getPortalInvoicesSchema)
    .query(async ({ ctx: { db }, input }) => {
      const customer = await getCustomerByPortalId(db, {
        portalId: input.portalId,
      });

      if (!customer) {
        return { data: [], meta: { cursor: null } };
      }

      const result = await getCustomerPortalInvoices(db, {
        customerId: customer.id,
        teamId: customer.teamId,
        cursor: input.cursor,
        pageSize: input.pageSize,
      });

      return {
        data: result.data,
        meta: {
          cursor: result.nextCursor,
        },
      };
    }),
});
