import { unavailableMessage } from "@business-operations/pramaan";
export function getProviderErrorDetails(error: unknown) { return { error: unavailableMessage(error) }; }
export class ProviderError extends Error { constructor(input: { message: string; code: string }) { super("This feature is not available yet."); this.code = input.code; } code: string; }
export function createErrorResponse(error: unknown) { return { error: unavailableMessage(error) }; }
