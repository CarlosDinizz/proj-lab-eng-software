import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { docker, fileInventory } from '../supets.mjs';
import { hashFile } from '../verification/releases.mjs';

export async function validateBuildArtifacts(manifest) {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'supets-ci-artifacts-'));
  try {
    for (const service of ['gateway', 'community', 'ocorrencias', 'web']) {
      const container = (await docker(['create', '--network', 'none', manifest.buildImages[service].id], { capture: true })).stdout.trim();
      const destination = path.join(temporary, service);
      await fs.mkdir(destination);
      try {
        const artifact = service === 'web' ? '/workspace/frontend/supets/dist/.' : `/workspace/microsservicos/${service}/target/${service === 'gateway' ? 'supets' : service}-0.0.1-SNAPSHOT.jar`;
        await docker(['cp', `${container}:${artifact}`, destination], { capture: true });
      } finally { await docker(['rm', container], { capture: true }); }
      if (service === 'web') {
        if (await hashFile(path.join(destination, 'index.html')) !== manifest.htmlSha256) throw new Error('Frozen frontend build HTML differs from runtime HTML');
        const actual = (await fileInventory(destination)).filter(file => file.path !== 'index.html' && !file.path.startsWith('history/')).sort((a, b) => a.path.localeCompare(b.path));
        const expected = [...manifest.assets].sort((a, b) => a.path.localeCompare(b.path));
        if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Frozen frontend build emitted assets differ from runtime assets');
      } else {
        const jar = path.join(destination, `${service === 'gateway' ? 'supets' : service}-0.0.1-SNAPSHOT.jar`);
        if (await hashFile(jar) !== manifest.jars[service]) throw new Error(`Frozen ${service} build JAR differs from runtime JAR`);
      }
    }
  } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}
