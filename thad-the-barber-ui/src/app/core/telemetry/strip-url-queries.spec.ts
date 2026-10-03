import { ITelemetryItem } from '@microsoft/applicationinsights-web';
import { stripUrlQueries } from './strip-url-queries';

describe(
  'stripUrlQueries',
  (): void => {
    it(
      'strips query strings and fragments from page-view URLs',
      (): void => {
        const item: ITelemetryItem = {
          name: 'pageview',
          baseType: 'PageviewData',
          baseData: {
            name: 'Book?',
            uri: 'https://site.example.com/book?phone=555#time',
            refUri: 'https://site.example.com/?utm_source=x',
          },
        };

        stripUrlQueries(item);

        expect(item.baseData).toEqual({
          name: 'Book?',
          uri: 'https://site.example.com/book',
          refUri: 'https://site.example.com/',
        });
      },
    );

    it(
      'strips query strings from a dependency name and target',
      (): void => {
        const item: ITelemetryItem = {
          name: 'dependency',
          baseType: 'RemoteDependencyData',
          baseData: {
            name: 'GET https://api.example.com/api/availability?date=2026-10-03',
            target: 'https://api.example.com/api/availability?date=2026-10-03',
          },
        };

        stripUrlQueries(item);

        expect(item.baseData).toEqual({
          name: 'GET https://api.example.com/api/availability',
          target: 'https://api.example.com/api/availability',
        });
      },
    );

    it(
      'leaves items without base data alone',
      (): void => {
        const item: ITelemetryItem = { name: 'event' };

        stripUrlQueries(item);

        expect(item).toEqual({ name: 'event' });
      },
    );
  },
);
