/**
 * Square searches at most 32 days of availability at once, so the API takes 31 whole days per request (one Square call,
 * even across a DST change; `AvailabilityService.MaxDayCount`) and rejects more. The date step shows this many days at
 * a time so each view is one request (#205). Change it only with the API's limit.
 */
export const MAX_DAYS_PER_AVAILABILITY_REQUEST: number = 31;

/** A day with fewer open times than this is "filling up" (BR-15, #206): its row and time step say how few are left. */
export const FILLING_UP_BELOW: number = 5;
