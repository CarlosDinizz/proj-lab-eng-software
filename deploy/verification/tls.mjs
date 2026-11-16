import * as fs from 'node:fs/promises';
import path from 'node:path';
import { X509Certificate } from 'node:crypto';
import { atomicJson } from '../supets.mjs';

const production = 'https://acme-v02.api.letsencrypt.org/directory';
const staging = 'https://acme-staging-v02.api.letsencrypt.org/directory';
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function certificate(project, manifest, ip, expectStaging) {
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    const files = await project.compose(['exec', '-T', 'web', 'find', '/data/caddy/certificates', '-type', 'f', '-name', '*.crt'], { manifest, capture: true, allowFailure: true, timeout: 5000 });
    for (const file of files.stdout.trim().split('\n').filter(Boolean)) {
      const result = await project.compose(['exec', '-T', 'web', 'cat', file], { manifest, capture: true, allowFailure: true, timeout: 5000 });
      if (result.code) continue;
      let cert;
      try { cert = new X509Certificate(result.stdout); } catch { continue; }
      if (cert.checkIP(ip) === ip && /STAGING/i.test(cert.issuer) === expectStaging && Date.parse(cert.validTo) > Date.now()) {
        return { ip, issuer: cert.issuer, subjectAltName: cert.subjectAltName, validFrom: cert.validFrom, validTo: cert.validTo, fingerprint256: cert.fingerprint256 };
      }
    }
    await pause(1000);
  }
  throw new Error(`${expectStaging ? 'Staging' : 'Production'} ACME IP certificate not issued within 180s; maintain unavailable public credentials and inspect Caddy/port reachability`);
}

export async function prepareCloudTLS(project, manifest) {
  const ip = new URL(project.config.SITE_ADDRESS).hostname;
  const checkpoint = path.join(project.state, 'tls-verification.json');
  let previous;
  try { previous = JSON.parse(await fs.readFile(checkpoint, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  project.config.WEB_MODE = 'maintenance';
  if (previous?.production?.ip !== ip) {
    const override = path.join(project.state, 'tls-staging.yml');
    const label = `        com.supets.managed: "true"\n        com.supets.project: ${project.settings.project}`;
    await fs.writeFile(override, `services:\n  web:\n    volumes: !override\n      - caddy-staging-data:/data\n      - caddy-staging-config:/config\n      - asset-history:/srv/history:ro\nvolumes:\n  caddy-staging-data:\n    labels:\n${label}\n  caddy-staging-config:\n    labels:\n${label}\n`, { mode: 0o600 });
    if (process.getuid() === 0) await fs.chown(override, 1000, 1000);
    project.config.ACME_CA = staging;
    await project.saveConfig();
    try {
      await project.compose(['up', '-d', '--no-deps', '--force-recreate', 'web'], { manifest, extra: [override] });
      // Read the public certificate, never the key. Staging trust is not public trust.
      const staged = await certificate(project, manifest, ip, true);
      await atomicJson(path.join(project.state, 'tls-staging-verification.json'), { at: new Date().toISOString(), certificate: staged, publicTrust: false, credentialsAvailable: false });
    } finally {
      project.config.ACME_CA = production;
      await project.saveConfig();
    }
  }
  project.config.ACME_CA = production;
  await project.mode('maintenance', manifest);
  const issued = await certificate(project, manifest, ip, false);
  // An ordinary verified HTTPS request is mandatory; no insecure TLS fallback.
  await project.request(project.config.SITE_ADDRESS, { status: 503, timeout: 15000 });
  await atomicJson(checkpoint, { at: new Date().toISOString(), production: issued, trustedHttps: true, naturalRenewalObserved: false });
}
