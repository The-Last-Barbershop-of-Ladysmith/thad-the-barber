/** One appointment for an "Add to calendar" file. `startAt` is a UTC instant. */
export interface CalendarEvent {
  uid: string;
  startAt: string;
  durationMinutes: number;
  title: string;
  location: string | null;
  description: string;
  url: string;
}
