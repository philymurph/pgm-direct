export const REVOLUT_PENDING_ORDER_EXPIRY = "PT30M";

// Revolut retries failed webhook deliveries three times at ten-minute
// intervals. Keep stock reserved through that delivery window.
export const INVENTORY_RESERVATION_TTL_MS = 65 * 60 * 1000;
