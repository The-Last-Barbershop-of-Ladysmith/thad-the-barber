/**
 * The booking page opens on the open days from today, on the shop's clock, through the days after it: one availability
 * request, which the API caps at 31 days (#205).
 */
export const UPCOMING_DAY_COUNT: number = 31;

/** A day with fewer open times than this is "filling up" (BR-15, #206): its row and time step say how few are left. */
export const FILLING_UP_BELOW: number = 5;
