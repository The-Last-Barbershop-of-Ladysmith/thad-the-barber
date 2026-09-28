export interface TimeSlot {
  /** 24h key, e.g. "14:30". */
  time: string;
  /** Display label, e.g. "2:30 PM". */
  label: string;
  available: boolean;
}

export interface BookingRequest {
  /** ISO date, e.g. "2026-10-03". */
  date: string;
  time: string;
  name: string;
  phone: string;
}

export interface BookingConfirmation extends BookingRequest { id: string; }

export interface BookingDetails {
  name: string;
  phone: string;
}

export interface DateRange {
  min: Date;
  max: Date;
}

export interface BookingRules {
  /** How many days ahead a customer can book. */
  daysAhead: number;
  /** Appointment length. */
  slotMinutes: number;
}
