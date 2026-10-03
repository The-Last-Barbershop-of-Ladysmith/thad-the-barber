import { ITelemetryItem } from '@microsoft/applicationinsights-web';

const DEPENDENCY_TYPE: string = 'RemoteDependencyData';

const URL_FIELDS: readonly string[] = [
  'uri',
  'refUri',
  'url',
  'target',
];
// A dependency's name is "<METHOD> <full URL>"; other items' names are titles, which may contain "?".
const DEPENDENCY_FIELDS: readonly string[] = [...URL_FIELDS, 'name'];

/** Telemetry initializer: drops query strings and fragments from every URL field before export (BR-23). */
export function stripUrlQueries(item: ITelemetryItem): void {
  const baseData: Record<string, unknown> | undefined = item.baseData;
  if (!baseData) {
    return;
  }
  const fields: readonly string[] = item.baseType === DEPENDENCY_TYPE ? DEPENDENCY_FIELDS : URL_FIELDS;
  fields.forEach((field: string): void => {
    const value: unknown = baseData[field];
    if (typeof value === 'string') {
      baseData[field] = value.replace(/[?#].*$/, '');
    }
  });
}

