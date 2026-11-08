import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

var SHOP = { name: 'Test Shop', phone: { display: '(555) 010-0000', tel: 'tel:+15550100000', sms: 'sms:+15550100000' }, bookingUrl: 'https://test-shop.example' };
var CLIENT_ROUTES = ['book', 'book/manage', 'book/manage/:id', 'book/manage/:id/reschedule'];
var FONT_PRELOADS = ['/media/display-latin-ABCD1234.woff2', '/media/body-latin-EFGH5678.woff2'];

// Writes a fake Angular build ({ 'relative/path': contents }, plus a shop.json, client-routes.json and
// font-preloads.json) and loads the app against it.
export function createFakeDist(files) {
  var dist = mkdtempSync(join(tmpdir(), 'ttb-dist-'));
  var defaults = {
    'shop.json': JSON.stringify(SHOP),
    'client-routes.json': JSON.stringify(CLIENT_ROUTES),
    'font-preloads.json': JSON.stringify(FONT_PRELOADS),
  };
  for (var [file, contents] of Object.entries({ ...defaults, ...files })) {
    mkdirSync(dirname(join(dist, file)), { recursive: true });
    writeFileSync(join(dist, file), contents);
  }
  process.env.ANGULAR_DIST_PATH = dist;
  return {
    app: createRequire(import.meta.url)('../app'),
    cleanup: function() {
      rmSync(dist, { recursive: true, force: true });
    },
  };
}
