import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

// Writes a fake Angular build ({ 'relative/path': contents }) and loads the app against it.
export function createFakeDist(files) {
  var dist = mkdtempSync(join(tmpdir(), 'ttb-dist-'));
  for (var [file, contents] of Object.entries(files)) {
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
