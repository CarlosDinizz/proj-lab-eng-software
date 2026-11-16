import * as fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { run } from '../supets.mjs';
import { validateSource, validateImages, validateManifest, hashFile, fingerprint, releaseDirectory, packageRelease, preflight } from '../verification/releases.mjs';
import { validateBuildArtifacts } from './artifacts.mjs';
import { publishedMainApproval, repository, ref } from './approval.mjs';

const action = process.argv[2];
const workspace = process.env.WORKSPACE;
const projectName = process.env.PROJECT;
const platform = process.env.TARGET_PLATFORM;
const publicPort = Number(process.env.PUBLIC_PORT);
const buildTag = process.env.BUILD_TAG;
const identifier = value => typeof value === 'string' && /^[a-z0-9][a-z0-9_-]*$/.test(value);
if (!['checkout', 'verify', 'package', 'deploy'].includes(action) || process.argv.length !== 3 || process.env.SUPETS_CI_TRACK !== 'main' || process.env.JOB_NAME !== 'supets-main' || !identifier(projectName) || projectName !== process.env.SUPETS_PROJECT || !['linux/amd64', 'linux/arm64'].includes(platform) || !Number.isInteger(publicPort) || publicPort < 1024 || publicPort > 65535 || !['true', 'false'].includes(process.env.CLOUD) || !workspace || !path.isAbsolute(workspace) || path.resolve(process.cwd()) !== path.resolve(workspace) || !buildTag) throw new Error('Published main runs only in the administrator-approved supets-main job with validated project parameters');
await publishedMainApproval();
const ci = path.join(workspace, '.ci');
const checkout = path.join(workspace, 'approved-source');
const exportRoot = path.join(workspace, '.supets');
const exports = path.join(exportRoot, projectName);
process.env.SUPETS_EXPORT_ROOT = exportRoot;
const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const exists = async file => fs.access(file).then(() => true, () => false);
const json = async (file, value) => { await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 }); await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 }); };
const git = args => run('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'protocol.file.allow=never', '-C', checkout, ...args], { capture: true, timeout: 120000 });
const argv = command => [command, '--project', projectName, '--port', String(publicPort), '--platform', platform, ...(process.env.CLOUD === 'true' ? ['--cloud'] : [])];

async function files(directory, prefix = '') {
  if (!await exists(directory)) return [];
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink() || !entry.isDirectory() && !entry.isFile()) throw new Error('Jenkins evidence cannot contain links or special files');
    if (entry.isDirectory()) result.push(...await files(path.join(directory, entry.name), relative));
    else result.push(relative);
  }
  return result.sort();
}
async function receipt() {
  const value = await readJson(path.join(ci, 'main.json'));
  if (value.producer !== 'supets-main' || value.buildTag !== buildTag || value.project !== projectName || value.platform !== platform || value.publicPort !== publicPort || value.cloud !== (process.env.CLOUD === 'true') || !/^[a-f0-9]{40}$/.test(value.commit || '') || !/^[a-f0-9]{64}$/.test(value.jenkinsfileSha256 || '')) throw new Error('Main receipt belongs to another build or input');
  return value;
}
async function validateCheckout(value) {
  if ((await git(['remote', 'get-url', 'origin'])).stdout.trim() !== repository || (await git(['rev-parse', 'HEAD'])).stdout.trim() !== value.commit || (await git(['rev-parse', 'refs/remotes/origin/main'])).stdout.trim() !== value.commit || (await git(['status', '--porcelain', '--untracked-files=all'])).stdout.trim() || await hashFile(path.join(checkout, 'Jenkinsfile')) !== value.jenkinsfileSha256) throw new Error('Checkout differs from this build’s recorded trusted main revision');
}
async function checkoutMain() {
  if (await exists(ci)) {
    const previous = await readJson(path.join(ci, 'main.json'));
    if (previous.producer !== 'supets-main') throw new Error('Refusing to replace an unrelated .ci directory');
    if (await exists(checkout)) {
      if (!(await fs.lstat(checkout)).isDirectory()) throw new Error('Managed main checkout is not a regular directory');
      await fs.rm(checkout, { recursive: true });
    }
    await fs.rm(ci, { recursive: true });
  } else if (await exists(checkout)) throw new Error('Refusing to overwrite an unrelated approved-source directory');
  const value = { producer: 'supets-main', format: 1, invocation: randomUUID(), buildTag, project: projectName, platform, publicPort, cloud: process.env.CLOUD === 'true', repository, ref, startedAt: new Date().toISOString(), reportsExisting: await files(path.join(exports, 'reports')) };
  await json(path.join(ci, 'main.json'), value);
  await fs.mkdir(checkout, { mode: 0o700 });
  await git(['init', '--initial-branch=main']);
  await git(['remote', 'add', 'origin', repository]);
  // Fetch only the public main ref. A caller cannot supply another repository/ref/revision.
  await git(['fetch', '--no-tags', '--depth=1', 'origin', `${ref}:refs/remotes/origin/main`]);
  value.commit = (await git(['rev-parse', 'refs/remotes/origin/main^{commit}'])).stdout.trim();
  if (!/^[a-f0-9]{40}$/.test(value.commit)) throw new Error('Fetched main has an invalid commit identity');
  await git(['checkout', '--detach', value.commit]);
  value.jenkinsfileSha256 = await hashFile(path.join(checkout, 'Jenkinsfile'));
  await json(path.join(ci, 'main.json'), value);
  await validateCheckout(value);
  await json(path.join(ci, 'checkout.json'), { passed: true, buildTag, repository, ref, commit: value.commit, jenkinsfileSha256: value.jenkinsfileSha256 });
}
async function withProject(callback) {
  await validateCheckout(await receipt());
  // Only trusted published main is loaded; branch/PR/repository inputs are never accepted.
  const { Project, options } = await import(pathToFileURL(path.join(checkout, 'deploy', 'supets.mjs')));
  const project = new Project(options(argv('verify')));
  project.exports = exports;
  await project.initialize();
  await project.acquire();
  try { return await callback(project); }
  finally { await project.disconnect(); await project.releaseLock(); }
}
async function audit(project, manifest, phase) {
  await validateSource(manifest);
  await validateImages(project, manifest);
  await validateBuildArtifacts(manifest);
  await json(path.join(ci, `audit-${phase}.json`), { format: 1, passed: true, buildTag, release: manifest.id, phase, at: new Date().toISOString(), fingerprint: fingerprint(manifest), images: manifest.images, buildImages: manifest.buildImages, jars: manifest.jars, htmlSha256: manifest.htmlSha256, staticAssets: manifest.assets.length, sourceFiles: manifest.source.files.length });
}
async function collect(value, verified) {
  const reports = (await files(path.join(exports, 'reports'))).filter(file => !value.reportsExisting.includes(file));
  const evidenceDirectory = value.release ? path.join(releaseDirectory(value.release), 'evidence') : null;
  const evidence = evidenceDirectory ? await files(evidenceDirectory) : [];
  for (const [base, names, destination] of [[path.join(exports, 'reports'), reports, path.join(ci, 'evidence', 'reports')], [evidenceDirectory, evidence, path.join(ci, 'evidence', 'verification')]]) {
    for (const relative of names) {
      const output = path.join(destination, relative);
      await fs.mkdir(path.dirname(output), { recursive: true, mode: 0o700 });
      await fs.copyFile(path.join(base, relative), output);
    }
  }
  const frontendTap = reports.some(file => file.endsWith('.tap'));
  if (frontendTap) await fs.writeFile(path.join(ci, 'evidence', 'reports', 'frontend.tap-present'), 'Frontend TAP collected from this main build.\n', { mode: 0o600 });
  const missingJUnit = ['gateway', 'community', 'ocorrencias'].filter(service => !reports.some(file => file.includes(`/${service}/`) && file.endsWith('.xml')));
  const statements = await Promise.all(evidence.map(file => readJson(path.join(evidenceDirectory, file))));
  const attested = statements.some(statement => statement.release === value.release && statement.imported === false && statement.passed === true && statement.fingerprint === value.fingerprint && ['frozen-image-unit-and-postgresql-tests', 'isolated-runtime-api-probes'].every(kind => statement.results.some(result => result.kind === kind && result.passed === true && result.fingerprint === value.fingerprint)));
  const passed = verified && frontendTap && missingJUnit.length === 0 && attested;
  await json(path.join(ci, 'collection.json'), { passed, buildTag, release: value.release, reports, evidence, frontendTap, missingJUnit, independentAttestation: attested });
  if (verified && !passed) throw new Error('Main verification lacks required JUnit, TAP or independent frozen-image evidence');
}
async function verifyMain() {
  const value = await receipt();
  let verified = false;
  try {
    await withProject(async project => {
      // Package/build once; verification below reuses these compiled/runtime images.
      const manifest = await project.build();
      value.release = manifest.id;
      value.fingerprint = fingerprint(manifest);
      if (manifest.source.baseCommit !== value.commit) throw new Error('Built source commit does not match this build’s fetched main commit');
      await json(path.join(ci, 'main.json'), value);
      await audit(project, manifest, 'before');
      const { verifyBuilt } = await import(pathToFileURL(path.join(checkout, 'deploy', 'verification', 'lifecycle.mjs')));
      if (typeof verifyBuilt !== 'function') throw new Error('Reviewed main must expose frozen-build verification; refusing a rebuild fallback');
      const frozen = await verifyBuilt(project, manifest);
      if (frozen.id !== value.release || fingerprint(frozen) !== value.fingerprint) throw new Error('Verification changed the built release identity');
      await audit(project, frozen, 'after');
      value.manifestSha256 = await hashFile(path.join(releaseDirectory(value.release), 'manifest.json'));
      await fs.copyFile(path.join(releaseDirectory(value.release), 'manifest.json'), path.join(ci, 'manifest.json'));
      await json(path.join(ci, 'main.json'), value);
      verified = true;
    });
  } finally {
    await json(path.join(ci, 'verification.json'), { buildTag, release: value.release, fingerprint: value.fingerprint, at: new Date().toISOString(), exitCode: verified ? 0 : 1 });
    await collect(value, verified);
  }
}
async function frozen(value, project) {
  if (!identifier(value.release)) throw new Error('No generated release handoff exists');
  const file = path.join(releaseDirectory(value.release), 'manifest.json');
  const manifest = validateManifest(await readJson(file), platform);
  const [verification, collection, before, after] = await Promise.all(['verification', 'collection', 'audit-before', 'audit-after'].map(name => readJson(path.join(ci, `${name}.json`))));
  if (manifest.id !== value.release || manifest.source.baseCommit !== value.commit || await hashFile(file) !== value.manifestSha256 || fingerprint(manifest) !== value.fingerprint || verification.exitCode !== 0 || collection.passed !== true || before.passed !== true || after.passed !== true || before.fingerprint !== value.fingerprint || after.fingerprint !== value.fingerprint) throw new Error('Exact generated release lacks passing immutable main evidence');
  await validateSource(manifest);
  await validateImages(project, manifest);
  await validateBuildArtifacts(manifest);
  return manifest;
}
async function packageMain() {
  const value = await receipt();
  await withProject(async project => {
    const manifest = await frozen(value, project);
    const result = await packageRelease(project, manifest);
    await json(path.join(ci, 'release.json'), { format: 1, buildTag, id: manifest.id, commit: value.commit, manifestSha256: value.manifestSha256, fingerprint: value.fingerprint, archive: path.relative(workspace, result.archive), archiveSha256: result.sha256 });
  });
}
async function deployMain() {
  const value = await receipt();
  const handoff = await readJson(path.join(ci, 'release.json'));
  if (handoff.buildTag !== buildTag || handoff.id !== value.release || handoff.fingerprint !== value.fingerprint || handoff.manifestSha256 !== value.manifestSha256 || await hashFile(path.join(exports, 'candidates', `${value.release}.tar`)) !== handoff.archiveSha256) throw new Error('Generated release archive/handoff changed before deployment');
  let passed = false;
  try {
    await withProject(async project => {
      const manifest = await frozen(value, project);
      await project.loadConfig(false);
      await preflight(project, manifest, { verified: true });
      await project.deploy(manifest, { preflightComplete: true });
      passed = true;
    });
  } finally { await json(path.join(ci, 'deployment.json'), { buildTag, release: value.release, fingerprint: value.fingerprint, at: new Date().toISOString(), exitCode: passed ? 0 : 1 }); }
}

try {
  if (action === 'checkout') await checkoutMain();
  else if (action === 'verify') await verifyMain();
  else if (action === 'package') await packageMain();
  else await deployMain();
} catch (error) {
  console.error(`Approved main ${action} failed: ${error.message}`);
  if (await exists(ci)) await json(path.join(ci, `main-${action}-failure.json`), { passed: false, buildTag, action, at: new Date().toISOString(), message: error.message });
  process.exitCode = 1;
}
