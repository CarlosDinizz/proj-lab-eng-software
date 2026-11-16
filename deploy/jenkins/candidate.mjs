import * as fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Project, options } from '../supets.mjs';
import { importArchive, validateSource, validateImages, validateManifest, hashFile, fingerprint, releaseDirectory } from '../verification/releases.mjs';
import { validateBuildArtifacts } from './artifacts.mjs';

const identifier = value => typeof value === 'string' && /^[a-z0-9][a-z0-9_-]*$/.test(value);
const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const exists = async file => fs.access(file).then(() => true, () => false);
const json = async (file, value) => { await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 }); await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 }); };
const projectName = process.env.PROJECT;
const id = process.env.CANDIDATE_ID;
const platform = process.env.TARGET_PLATFORM;
const publicPort = Number(process.env.PUBLIC_PORT);
const action = process.argv[2];
const phase = process.argv[3];
const workspace = process.env.WORKSPACE;
const buildTag = process.env.BUILD_TAG;
if (!identifier(projectName) || projectName !== process.env.SUPETS_PROJECT || !identifier(id) || !['linux/amd64', 'linux/arm64'].includes(platform) || !Number.isInteger(publicPort) || publicPort < 1024 || publicPort > 65535 || !['true', 'false'].includes(process.env.CLOUD) || !workspace || !path.isAbsolute(workspace) || path.resolve(process.cwd()) !== path.resolve(workspace) || !buildTag) throw new Error('Run only in the trusted candidate job workspace with validated project, release, port, platform and cloud parameters');
if (!['import', 'audit', 'verify', 'collect', 'deploy'].includes(action) || action === 'audit' && !['before', 'after'].includes(phase) || action !== 'audit' && phase) throw new Error('Invalid candidate pipeline action; main/branch checkout mode remains disabled until reviewed publication');
const ci = path.join(workspace, '.ci');
const exportRoot = path.join(workspace, '.supets');
const exports = path.join(exportRoot, projectName);
const directory = releaseDirectory(id);
const source = path.join(directory, 'source');
const manifestFile = path.join(directory, 'manifest.json');
const argv = command => [command, ...(command === 'verify' ? ['--candidate', id] : command === 'deploy' ? [id] : []), '--project', projectName, '--port', String(publicPort), '--platform', platform, ...(process.env.CLOUD === 'true' ? ['--cloud'] : [])];
const project = new Project(options(argv('verify')));
project.exports = exports;

async function files(directory, prefix = '') {
  if (!await exists(directory)) return [];
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink() || !entry.isDirectory() && !entry.isFile()) throw new Error('Evidence and incoming transfers must not contain links or special files');
    if (entry.isDirectory()) result.push(...await files(path.join(directory, entry.name), relative));
    else result.push(relative);
  }
  return result.sort();
}
async function invocation() {
  const receipt = await readJson(path.join(ci, 'invocation.json'));
  if (receipt.producer !== 'supets-candidate' || receipt.buildTag !== buildTag || receipt.release !== id || receipt.project !== projectName || receipt.platform !== platform || receipt.publicPort !== publicPort || receipt.cloud !== (process.env.CLOUD === 'true')) throw new Error('Candidate receipt belongs to another build or input');
  return receipt;
}
async function manifest() {
  const value = validateManifest(await readJson(manifestFile), platform);
  if (value.id !== id) throw new Error('Stored candidate identifier mismatch');
  return value;
}
async function withLock(callback) {
  await project.initialize();
  await project.acquire();
  try { return await callback(); }
  finally { await project.disconnect(); await project.releaseLock(); }
}
async function importCandidate() {
  if (await exists(ci)) {
    const previous = await readJson(path.join(ci, 'invocation.json'));
    if (previous.producer !== 'supets-candidate') throw new Error('Refusing to overwrite an unrelated .ci directory');
    await fs.rm(ci, { recursive: true });
  }
  const receipt = { producer: 'supets-candidate', format: 1, invocation: randomUUID(), buildTag, project: projectName, release: id, platform, publicPort, cloud: process.env.CLOUD === 'true', startedAt: new Date().toISOString(), imported: false };
  await json(path.join(ci, 'invocation.json'), receipt);
  const incoming = path.join(workspace, 'incoming', `${id}.tar`);
  const checksumFile = `${incoming}.sha256`;
  for (const file of [incoming, checksumFile]) if (!(await fs.lstat(file)).isFile()) throw new Error('Incoming candidate and sidecar must be regular files');
  const checksum = (await fs.readFile(checksumFile, 'utf8')).trim();
  const expected = /^([a-f0-9]{64})  ([a-z0-9_-]+\.tar)$/.exec(checksum);
  if (!expected || expected[2] !== `${id}.tar` || expected[1] !== await hashFile(incoming)) throw new Error('External transfer checksum mismatch; nothing has been extracted or loaded');
  const destination = path.join(exports, 'candidates');
  await fs.mkdir(destination, { recursive: true, mode: 0o700 });
  await fs.copyFile(incoming, path.join(destination, `${id}.tar`));
  await fs.copyFile(checksumFile, path.join(destination, `${id}.tar.sha256`));
  const value = await withLock(() => importArchive(project, id));
  receipt.imported = true;
  receipt.archiveSha256 = expected[1];
  receipt.manifestSha256 = await hashFile(manifestFile);
  receipt.fingerprint = fingerprint(value);
  receipt.reportsExisting = await files(path.join(exports, 'reports'));
  receipt.evidenceExisting = await files(path.join(directory, 'evidence'));
  await json(path.join(ci, 'invocation.json'), receipt);
  await fs.copyFile(manifestFile, path.join(ci, 'manifest.json'));
}
async function audit() {
  const receipt = await invocation();
  if (!receipt.imported) throw new Error('Candidate import has not completed');
  const result = await withLock(async () => {
    const value = await manifest();
    await validateSource(value);
    await validateImages(project, value);
    await validateBuildArtifacts(value);
    const digest = await hashFile(manifestFile);
    const bound = fingerprint(value);
    if (digest !== receipt.manifestSha256 || bound !== receipt.fingerprint) throw new Error('Immutable candidate changed since import');
    if (phase === 'after') {
      const before = await readJson(path.join(ci, 'audit-before.json'));
      if (before.manifestSha256 !== digest || before.fingerprint !== bound || before.passed !== true) throw new Error('Before/after candidate identity differs');
    }
    return { format: 1, release: id, buildTag, phase, at: new Date().toISOString(), passed: true, manifestSha256: digest, fingerprint: bound, images: value.images, buildImages: value.buildImages, jars: value.jars, htmlSha256: value.htmlSha256, sourceFiles: value.source.files.length, staticAssets: value.assets.length };
  });
  await json(path.join(ci, `audit-${phase}.json`), result);
}
async function controller(command) {
  const receipt = await invocation();
  const before = await readJson(path.join(ci, 'audit-before.json'));
  if (!receipt.imported || before.passed !== true || before.fingerprint !== receipt.fingerprint || await hashFile(manifestFile) !== receipt.manifestSha256) throw new Error('Candidate must pass its immutable hash audit before execution');
  if (command === 'deploy') {
    const [verification, after, collection] = await Promise.all(['verification', 'audit-after', 'collection'].map(name => readJson(path.join(ci, `${name}.json`))));
    if (verification.exitCode !== 0 || after.passed !== true || after.fingerprint !== receipt.fingerprint || collection.passed !== true) throw new Error('Deployment requires passing tests, post-test hashes and complete independent evidence');
  }
  const script = path.join(source, 'deploy', 'supets.mjs');
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...argv(command)], { cwd: source, env: { ...process.env, SUPETS_EXPORT_ROOT: exportRoot, WORKSPACE: workspace }, stdio: 'inherit' });
    let terminating;
    const forward = signal => { terminating = signal; child.kill(signal); };
    const term = () => forward('SIGTERM');
    const interrupt = () => forward('SIGINT');
    process.once('SIGTERM', term);
    process.once('SIGINT', interrupt);
    const finish = () => { process.removeListener('SIGTERM', term); process.removeListener('SIGINT', interrupt); };
    child.once('error', error => { finish(); reject(error); });
    child.once('exit', (code, signal) => { finish(); resolve({ exitCode: code ?? 128, signal: signal || terminating || null }); });
  });
  await json(path.join(ci, command === 'verify' ? 'verification.json' : 'deployment.json'), { release: id, buildTag, at: new Date().toISOString(), fingerprint: receipt.fingerprint, ...result });
  if (result.exitCode) process.exitCode = result.exitCode;
}
async function collect() {
  const receipt = await invocation();
  const verificationFile = path.join(ci, 'verification.json');
  const verification = await exists(verificationFile) ? await readJson(verificationFile) : { exitCode: 128, resultUnavailable: true };
  const reports = (await files(path.join(exports, 'reports'))).filter(file => !receipt.reportsExisting.includes(file));
  const evidence = (await files(path.join(directory, 'evidence'))).filter(file => !receipt.evidenceExisting.includes(file));
  const target = path.join(ci, 'evidence');
  for (const [base, names, destination] of [[path.join(exports, 'reports'), reports, path.join(target, 'reports')], [path.join(directory, 'evidence'), evidence, path.join(target, 'verification')]]) {
    for (const relative of names) {
      const output = path.join(destination, relative);
      await fs.mkdir(path.dirname(output), { recursive: true, mode: 0o700 });
      await fs.copyFile(path.join(base, relative), output);
    }
  }
  const hasTap = reports.some(file => file.endsWith('.tap'));
  if (hasTap) await fs.writeFile(path.join(target, 'reports', 'frontend.tap-present'), 'Frontend TAP was collected from this build.\n', { mode: 0o600 });
  const missing = ['gateway', 'community', 'ocorrencias'].filter(service => !reports.some(file => file.includes(`/${service}/`) && file.endsWith('.xml')));
  const statements = await Promise.all(evidence.map(file => readJson(path.join(directory, 'evidence', file))));
  const attested = statements.some(value => value.release === id && value.passed === true && value.imported === true && value.fingerprint === receipt.fingerprint && ['frozen-image-unit-and-postgresql-tests', 'isolated-runtime-api-probes'].every(kind => value.results.some(result => result.kind === kind && result.passed === true && result.fingerprint === receipt.fingerprint)));
  const passed = verification.exitCode === 0 && missing.length === 0 && hasTap && attested;
  await json(path.join(ci, 'collection.json'), { release: id, buildTag, at: new Date().toISOString(), passed, reports, evidence, missingJUnit: missing, frontendTap: hasTap, independentAttestation: attested });
  if (verification.exitCode === 0 && !passed) throw new Error('A successful verifier must provide all three JUnit reports, frontend TAP and separate passing candidate evidence');
}

try {
  if (action === 'import') await importCandidate();
  else if (action === 'audit') await audit();
  else if (action === 'collect') await collect();
  else await controller(action);
} catch (error) {
  console.error(`Candidate ${action} failed: ${error.message}`);
  if (await exists(ci)) await json(path.join(ci, `${action}-failure.json`), { release: id, buildTag, action, phase, at: new Date().toISOString(), passed: false, message: error.message });
  process.exitCode = 1;
}
