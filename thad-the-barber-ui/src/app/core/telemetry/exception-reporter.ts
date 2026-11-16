import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

/**
 * Where exceptions go once App Insights has loaded: `startTelemetry` sets `report`, and until then (or without a
 * connection string) nothing is sent.
 */
@Injectable({ providedIn: 'root' })
export class ExceptionReporter {
  report?: (error: unknown) => void;

  /** Logs a section that failed to load by name and HTTP status only, never the error's URL, body or message. */
  reportLoadFailure(section: string, error: unknown): void {
    let status: string = 'no response';
    if (error instanceof HttpErrorResponse && error.status > 0) {
      status = `status ${error.status}`;
    }
    this.report?.(new Error(`${section} failed to load (${status})`));
  }
}
