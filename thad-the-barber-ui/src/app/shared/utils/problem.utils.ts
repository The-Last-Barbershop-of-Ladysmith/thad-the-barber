import { HttpErrorResponse } from '@angular/common/http';
import { Notice } from '../models/notice.model';

/** The API's ProblemDetails `code` ("slot_unavailable"), or null for a network error or any other failure. */
export function getProblemCode(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }
  return (error.error as { code?: string; } | null)?.code ?? null;
}

/** The notice listed for the error's `code`, or `failedNotice` for any other code, a network error or other failure. */
export function toProblemNotice(
  error: unknown,
  problemNotices: Record<string, Notice>,
  failedNotice: Notice,
): Notice {
  return problemNotices[getProblemCode(error) ?? ''] ?? failedNotice;
}
