import { HttpErrorResponse } from '@angular/common/http';

/** The API's ProblemDetails `code` ("slot_unavailable"), or null for a network error or any other failure. */
export function getProblemCode(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }
  return (error.error as { code?: string; } | null)?.code ?? null;
}
