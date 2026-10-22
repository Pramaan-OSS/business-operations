export function deliveryReview(path: string) {
  const reviewUrl = `${process.env.BUSINESS_OPERATIONS_DASHBOARD_URL || "http://localhost:3001"}${path}`;
  const result = { approvalRequired: true, reviewUrl, message: "Review the recipient and details in the dashboard, then approve sending. Nothing has been sent." };
  return { content: [{ type: "text" as const, text: JSON.stringify(result) }], structuredContent: result };
}
