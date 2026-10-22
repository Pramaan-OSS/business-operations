export function getAppUrl() { return process.env.NEXT_PUBLIC_URL || process.env.BUSINESS_OPERATIONS_DASHBOARD_URL || "http://localhost:3001"; }
export function getEmailUrl() { return getAppUrl(); }
export function getCdnUrl() { return getAppUrl(); }
export function getApiUrl() { return process.env.BUSINESS_OPERATIONS_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"; }
