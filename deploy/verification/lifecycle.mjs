import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { writeJson } from '../supets.mjs';
import { runTests } from './tests.mjs';
import { candidate, fingerprint, freezeVerified, latestVerified, packageRelease, preflight, releaseDirectory, validateImages, validateManifest, validateSource } from './releases.mjs';
import { backup, restoreCheck } from './backups.mjs';

async function verify(project) {
  const imported = Boolean(project.settings.candidate);
  const manifest = imported ? await candidate(project, project.settings.candidate) : await project.build();
  return verifyBuilt(project, manifest, { imported });
}

export async function verifyBuilt(project, manifest, { imported = false } = {}) {
  validateManifest(manifest, project.settings.platform);
  await validateSource(manifest);
  await validateImages(project, manifest);
  const bound = fingerprint(manifest);
  const evidence = { format: 1, invocation: randomUUID(), release: manifest.id, fingerprint: bound, at: new Date().toISOString(), imported, passed: false, results: [] };
  try {
    const tests = await runTests(project, manifest);
    if (tests?.passed !== true) throw new Error('Test runner did not report passing frozen-image tests');
    evidence.results.push({ ...tests, kind: 'frozen-image-unit-and-postgresql-tests', fingerprint: bound });
    const { runRuntimeProbes } = await import('./api-probes.mjs');
    const probes = await runRuntimeProbes(project, manifest);
    if (probes?.passed !== true) throw new Error('API probe runner did not report passing isolated runtime probes');
    evidence.results.push({ ...probes, kind: 'isolated-runtime-api-probes', fingerprint: bound });
    // Reinspect after execution so evidence cannot attest to changed local files
    // or a runner that accidentally repackages a runtime artifact.
    await validateSource(manifest);
    await validateImages(project, manifest);
    if (fingerprint(manifest) !== bound) throw new Error('Frozen manifest changed during verification');
    evidence.passed = true;
    if (!imported) {
      manifest.evidence = evidence.results;
      await freezeVerified(manifest);
    }
  } finally {
    // Candidate manifests are never rewritten by Jenkins/later verification.
    await writeJson(path.join(releaseDirectory(manifest.id), 'evidence', `${evidence.invocation}.json`), evidence);
    await writeJson(path.join(project.exports, 'reports', manifest.id, `verification-${evidence.invocation}.json`), evidence);
  }
  console.log(`Verified frozen ${imported ? 'candidate' : 'release'} ${manifest.id}; evidence stored separately`);
  return manifest;
}

export async function execute(project) {
  switch (project.settings.command) {
    case 'verify': return verify(project);
    case 'release': return packageRelease(project, await latestVerified(project));
    case 'deploy': {
      const manifest = await candidate(project, project.settings.positional[0]);
      await project.loadConfig(true);
      await preflight(project, manifest, { verified: true });
      return project.deploy(manifest, { preflightComplete: true });
    }
    case 'backup':
      await project.loadConfig();
      return backup(project);
    case 'restore-check': return restoreCheck(project, project.settings.positional[0]);
    case 'verify-deploy': {
      const { verifyDeployment } = await import('./deployment-check.mjs');
      return verifyDeployment(project, await latestVerified(project));
    }
    case 'ci-up': {
      const { executeCI } = await import('./jenkins.mjs');
      return executeCI(project);
    }
    default: throw new Error(`Unsupported lifecycle command: ${project.settings.command}`);
  }
}
