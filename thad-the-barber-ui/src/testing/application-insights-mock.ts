import { Mock, vi } from 'vitest';

export interface ApplicationInsightsSpies {
  trackException: Mock;
  trackPageView: Mock;
  loadAppInsights: Mock;
  addTelemetryInitializer: Mock;
  getTraceCtx: Mock;
}

/**
 * The one fake of the App Insights SDK that every spec shares. The test build bundles the specs together, so two files
 * that each mocked `@microsoft/applicationinsights-web` with their own fake raced: whichever loaded first in a worker
 * won, and the other spec then called methods its fake didn't have. Sharing the fake and its spies removes the race.
 */
export const applicationInsightsSpies: ApplicationInsightsSpies = {
  trackException: vi.fn(),
  trackPageView: vi.fn(),
  loadAppInsights: vi.fn(),
  addTelemetryInitializer: vi.fn(),
  getTraceCtx: vi.fn(),
};

/** What `vi.mock('@microsoft/applicationinsights-web', …)` returns. */
export function applicationInsightsModule(): Record<string, unknown> {
  return {
    DistributedTracingModes: { W3C: 2 },
    ApplicationInsights: class {
      trackException: Mock = applicationInsightsSpies.trackException;
      trackPageView: Mock = applicationInsightsSpies.trackPageView;
      loadAppInsights: Mock = applicationInsightsSpies.loadAppInsights;
      addTelemetryInitializer: Mock = applicationInsightsSpies.addTelemetryInitializer;
      getTraceCtx: Mock = applicationInsightsSpies.getTraceCtx;
    },
  };
}
