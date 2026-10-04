import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

var SHOP = { name: 'Test Shop', phone: { display: '(555) 010-0000', tel: 'tel:+15550100000', sms: 'sms:+15550100000' }, bookingUrl: 'https://test-shop.example' };

// Writes a fake Angular build ({ 'relative/path': contents }, plus a shop.json) and loads the app against it.
export function createFakeDist(files) {
  var dist = mkdtempSync(join(tmpdir(), 'ttb-dist-'));
  for (var [file, contents] of Object.entries({ 'shop.json': JSON.stringify(SHOP), ...files })) {
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
