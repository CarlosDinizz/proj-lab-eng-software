import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const state = '/state';
const services = ['gateway', 'community', 'ocorrencias'];
const identifiers = /^[a-z0-9][a-z0-9_-]*$/;
const sha256 = value => createHash('sha256').update(value).digest('hex');
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const exists = async file => fs.access(file).then(() => true, () => false);
const json = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const id = () => `${new Date().toISOString().replace(/[^0-9]/g, '')}-${randomBytes(3).toString('hex')}`;
const baseEnvironment = Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'DOCKER_HOST'].filter(key => process.env[key]).map(key => [key, process.env[key]]));

export function options(argv) {
  const [command, ...args] = argv;
  const result = { command, project: 'supets-local', port: 8180, platform: process.env.SUPETS_PLATFORM || `linux/${os.arch() === 'arm64' ? 'arm64' : 'amd64'}`, positional: [] };
  const values = new Set(['project', 'port', 'platform', 'candidate', 'ip', 'acme-email']);
  for (let index = 0; index < args.length; index++) {
    const value = args[index];
    if (value === '--cloud') result.cloud = true;
    else if (value.startsWith('--')) {
      const key = value.slice(2);
      if (!values.has(key) || !args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`Invalid option: ${value}`);
      result[key] = args[++index];
    } else result.positional.push(value);
  }
  if (!['up', 'down', 'status', 'logs', 'verify', 'verify-deploy', 'release', 'deploy', 'backup', 'restore-check', 'ci-up'].includes(command)) throw new Error('Usage: supets up|down|status|logs|verify|verify-deploy|release|deploy|backup|restore-check|ci-up [--project name]');
  for (const value of [result.project, result.candidate, ...result.positional].filter(Boolean)) if (!identifiers.test(value)) throw new Error('Invalid project, service or release identifier');
  result.port = Number(result.port);
  if (!Number.isInteger(result.port) || result.port < 1024 || result.port > 65535) throw new Error('Port must be an integer from 1024 to 65535');
  if (!['linux/amd64', 'linux/arm64'].includes(result.platform)) throw new Error('Supported targets: linux/amd64 or linux/arm64');
  if ((result.ip || result['acme-email']) && !result.cloud) throw new Error('--ip and --acme-email require --cloud');
  if (result.ip && (isIP(result.ip) !== 4 || /^(0|10|127|169\.254|192\.168|172\.(1[6-9]|2[0-9]|3[01]))\./.test(result.ip) || Number(result.ip.split('.')[0]) >= 224)) throw new Error('--ip must be the assigned public IPv4');
  if (result['acme-email'] && !/^[^\s@=]+@[^\s@=]+\.[^\s@=]+$/.test(result['acme-email'])) throw new Error('Invalid ACME contact email');
  if (result.candidate && command !== 'verify') throw new Error('--candidate is only valid for verify');
  const expected = ['deploy', 'restore-check'].includes(command) ? 1 : 0;
  if (command !== 'logs' && result.positional.length !== expected || command === 'logs' && result.positional.length > 1) throw new Error(`Invalid arguments for ${command}`);
  return result;
}

export async function run(program, args, { capture = false, allowFailure = false, input, stdoutFd, env = {}, cwd = root, timeout = 1800000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { cwd, env: { ...baseEnvironment, ...env }, stdio: [input === undefined ? 'ignore' : 'pipe', stdoutFd ?? (capture ? 'pipe' : 'inherit'), capture ? 'pipe' : 'inherit'] });
    let stdout = '', stderr = '';
    if (capture) { child.stdout?.on('data', data => { stdout += data; }); child.stderr.on('data', data => { stderr += data; }); }
    if (input !== undefined) { child.stdin.on('error', () => {}); child.stdin.end(input); }
    const timer = setTimeout(() => child.kill('SIGTERM'), timeout);
    const killTimer = setTimeout(() => child.kill('SIGKILL'), timeout + 5000);
    child.on('error', error => { clearTimeout(timer); clearTimeout(killTimer); reject(error); });
    child.on('close', (code, signal) => {
      clearTimeout(timer); clearTimeout(killTimer);
      const result = { code: code ?? 1, stdout, stderr, signal };
      if (result.code && !allowFailure) reject(new Error(`${program} ${args.slice(0, 2).join(' ')} failed (${signal || result.code})${capture ? `: ${stderr.trim()}` : ''}`));
      else resolve(result);
    });
  });
}
export const docker = (args, settings) => run('docker', args, settings);
export async function stateDirectory(directory) {
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  if (directory === state || directory.startsWith(`${state}/`)) {
    for (let current = directory; current !== '/'; current = path.dirname(current)) {
      await fs.chmod(current, 0o700);
      if (process.getuid() === 0) await fs.chown(current, 1000, 1000);
      if (current === state) break;
    }
  }
}
export async function writeJson(file, value) {
  await stateDirectory(path.dirname(file));
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  if (file.startsWith(`${state}/`) && process.getuid() === 0) await fs.chown(file, 1000, 1000);
}
export async function atomicJson(file, value) { const temporary = `${file}.${randomUUID()}.new`; await writeJson(temporary, value); await fs.rename(temporary, file); }

export class Project {
  constructor(settings) {
    this.settings = settings;
    this.state = settings.stateDirectory || state;
    if (this.state !== state && !this.state.startsWith(`${state}/`)) throw new Error('Disposable control state must remain inside /state');
    this.name = `supets-${settings.project}`;
    const exportRoot = process.env.SUPETS_EXPORT_ROOT || path.join(root, '.supets');
    if (!path.isAbsolute(exportRoot) || path.basename(exportRoot) !== '.supets' ||
        process.env.SUPETS_EXPORT_ROOT && process.env.WORKSPACE && path.dirname(path.resolve(exportRoot)) !== path.resolve(process.env.WORKSPACE)) {
      throw new Error('SUPETS_EXPORT_ROOT must be the workspace absolute .supets directory');
    }
    this.exports = path.join(exportRoot, settings.project);
    this.container = process.env.SUPETS_CONTAINER_ID || os.hostname();
    this.connected = false;
    this.config = {};
    this.manifest = null;
  }
  async initialize() {
    const engine = JSON.parse((await docker(['info', '--format', '{{json .}}'], { capture: true })).stdout);
    if (engine.OSType !== 'linux') throw new Error('Docker must run Linux containers');
    await stateDirectory(this.state);
    await fs.mkdir(this.exports, { recursive: true });
  }
  async acquire() {
    const lock = path.join(this.state, 'operation.lock');
    const own = JSON.parse((await docker(['inspect', this.container], { capture: true })).stdout)[0];
    this.owner = { container: own.Id, pid: process.pid, start: await this.processStart(process.pid), uuid: randomUUID() };
    try { await fs.writeFile(lock, JSON.stringify(this.owner), { flag: 'wx', mode: 0o600 }); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      let previous;
      try { previous = await json(lock); } catch { throw new Error('Operation lock is incomplete; ownership cannot be proven. Preserve it for operator inspection.'); }
      const inspected = await docker(['inspect', previous.container], { capture: true, allowFailure: true });
      let abandoned = false;
      if (inspected.code) {
        if (/No such (object|container)/i.test(inspected.stderr)) abandoned = true;
        else throw new Error('Cannot establish operation-lock owner; Docker inspection failed');
      } else {
        const owner = JSON.parse(inspected.stdout)[0];
        if (!owner.State.Running) abandoned = true;
        else {
          const proc = await docker(['exec', previous.container, 'cat', `/proc/${Number(previous.pid)}/stat`], { capture: true, allowFailure: true });
          if (proc.code && /No such file/i.test(proc.stderr)) abandoned = true;
          else if (!proc.code) abandoned = proc.stdout.slice(proc.stdout.lastIndexOf(')') + 2).split(' ')[19] !== previous.start;
        }
      }
      if (!abandoned) throw new Error('Another project operation owns the lock; no concurrent mutation allowed');
      // Serialize stale-owner recovery; never rename a newly acquired contender's lock.
      const recovery = `${lock}.recovery`;
      try { await fs.mkdir(recovery, { mode: 0o700 }); }
      catch { throw new Error('Operation lock recovery already in progress or uncertain; preserve state'); }
      try {
        if ((await json(lock)).uuid !== previous.uuid) throw new Error('Operation lock changed; retry later');
        await fs.unlink(lock);
        await fs.writeFile(lock, JSON.stringify(this.owner), { flag: 'wx', mode: 0o600 });
      } finally { await fs.rmdir(recovery); }
    }
    if (process.getuid() === 0) await fs.chown(lock, 1000, 1000);
  }
  async processStart(pid) { const text = await fs.readFile(`/proc/${pid}/stat`, 'utf8'); return text.slice(text.lastIndexOf(')') + 2).split(' ')[19]; }
  async releaseLock() { const lock = path.join(this.state, 'operation.lock'); if (this.owner && await exists(lock) && (await json(lock)).uuid === this.owner.uuid) await fs.unlink(lock); }
  async loadConfig(create = false) {
    const file = path.join(this.state, 'runtime.env');
    if (await exists(file)) {
      const allowed = new Set(['COMMUNITY_DB_ADMIN_PASSWORD', 'COMMUNITY_DB_PASSWORD', 'OCORRENCIAS_DB_ADMIN_PASSWORD', 'OCORRENCIAS_DB_PASSWORD', 'JWT_SECRET', 'SITE_ADDRESS', 'ACME_EMAIL', 'ACME_CA', 'WEB_MODE', 'JENKINS_WEBHOOK_ENABLED']);
      for (const line of (await fs.readFile(file, 'utf8')).split('\n').filter(Boolean)) {
        const equal = line.indexOf('=');
        if (equal < 1) throw new Error('Malformed runtime.env; values not printed');
        const key = line.slice(0, equal);
        if (!allowed.has(key)) throw new Error('Unknown runtime.env setting; no ambient Compose overrides are accepted');
        this.config[key] = line.slice(equal + 1);
      }
    } else {
      if (!create) throw new Error('Project not initialized; run up first');
      for (const volume of ['community-data', 'ocorrencias-data']) {
        const found = await docker(['volume', 'inspect', `${this.name}_${volume}`], { capture: true, allowFailure: true });
        if (!found.code) throw new Error('Database volume exists without recovery configuration; refusing to reset credentials');
        if (!/no such volume/i.test(found.stderr)) throw new Error('Unable to inspect existing database volumes');
      }
      for (const key of ['COMMUNITY_DB_ADMIN_PASSWORD', 'COMMUNITY_DB_PASSWORD', 'OCORRENCIAS_DB_ADMIN_PASSWORD', 'OCORRENCIAS_DB_PASSWORD']) this.config[key] = randomBytes(32).toString('hex');
      Object.assign(this.config, { JWT_SECRET: randomBytes(64).toString('hex'), SITE_ADDRESS: 'http://:8080', ACME_EMAIL: '', ACME_CA: 'https://acme-v02.api.letsencrypt.org/directory', WEB_MODE: 'maintenance', JENKINS_WEBHOOK_ENABLED: 'false' });
    }
    if (this.settings.cloud) {
      if (this.settings.ip) this.config.SITE_ADDRESS = `https://${this.settings.ip}`;
      if (this.settings['acme-email']) this.config.ACME_EMAIL = this.settings['acme-email'];
      if (!/^https:\/\/\d+\.\d+\.\d+\.\d+$/.test(this.config.SITE_ADDRESS) || !this.config.ACME_EMAIL) throw new Error('First cloud deployment requires --ip and --acme-email');
    } else if (this.config.SITE_ADDRESS.startsWith('https:')) throw new Error('This project is configured for cloud; use --cloud');
    for (const key of ['COMMUNITY_DB_ADMIN_PASSWORD', 'COMMUNITY_DB_PASSWORD', 'OCORRENCIAS_DB_ADMIN_PASSWORD', 'OCORRENCIAS_DB_PASSWORD', 'JWT_SECRET']) if (!/^[a-f0-9]{64,}$/.test(this.config[key] || '')) throw new Error(`Invalid generated secret: ${key}; recover authoritative configuration`);
    if (Object.values(this.config).some(value => /[\r\n\0]/.test(value))) throw new Error('Invalid multiline configuration');
    if (!['maintenance', 'normal'].includes(this.config.WEB_MODE) || !['false', 'true'].includes(this.config.JENKINS_WEBHOOK_ENABLED)) throw new Error('Invalid runtime mode');
    if (!this.settings.cloud && this.config.SITE_ADDRESS !== 'http://:8080') throw new Error('Local site must use the private container HTTP listener');
    if (!['https://acme-v02.api.letsencrypt.org/directory', 'https://acme-staging-v02.api.letsencrypt.org/directory'].includes(this.config.ACME_CA)) throw new Error('Unsupported ACME issuer');
    if (create) await this.saveConfig();
    if (await exists(path.join(this.state, 'current.json'))) this.manifest = await json(path.join(this.state, 'current.json'));
  }
  async saveConfig() {
    const file = path.join(this.state, 'runtime.env');
    const temporary = `${file}.${randomUUID()}.new`;
    await fs.writeFile(temporary, Object.entries(this.config).map(([key, value]) => `${key}=${value}`).join('\n') + '\n', { mode: 0o600 });
    if (process.getuid() === 0) await fs.chown(temporary, 1000, 1000);
    await fs.rename(temporary, file);
  }
  environment(manifest = this.manifest) {
    const images = manifest?.images || {};
    return { ...this.config, COMPOSE_PROJECT_NAME: this.name, SUPETS_PROJECT: this.settings.project, SUPETS_PLATFORM: manifest?.platform || this.settings.platform, SUPETS_PORT: String(this.settings.port), WEB_IMAGE: images.web?.id || 'supets-uninitialized:web', GATEWAY_IMAGE: images.gateway?.id || 'supets-uninitialized:gateway', COMMUNITY_IMAGE: images.community?.id || 'supets-uninitialized:community', OCORRENCIAS_IMAGE: images.ocorrencias?.id || 'supets-uninitialized:ocorrencias', POSTGRES_IMAGE: images.postgres?.id || 'supets-uninitialized:postgres' };
  }
  async compose(args, { manifest = this.manifest, extra = [], env = {}, ...settings } = {}) {
    const directory = manifest ? path.join(state, 'releases', manifest.id, 'source') : root;
    if (manifest && !await exists(directory)) throw new Error('Frozen release configuration is missing; restore the verified candidate');
    const files = ['-f', 'deploy/docker-compose.yml'];
    if (this.settings.cloud) files.push('-f', 'deploy/compose.cloud.yml');
    for (const file of extra) files.push('-f', file);
    return docker(['compose', '--project-name', this.name, '--project-directory', directory, '--env-file', '/dev/null', ...files, ...args], { ...settings, cwd: directory, env: { ...this.environment(manifest), ...env } });
  }
  async ci(args) {
    const metadata = path.join(this.state, 'jenkins.json');
    if (!await exists(metadata)) return false;
    const env = await json(metadata);
    await docker(['compose', '--project-name', this.name, '--project-directory', root, '--env-file', '/dev/null', '-f', 'deploy/compose.ci.yml', ...args], { cwd: root, env });
    return true;
  }
  async connect() {
    if (this.connected) return;
    const result = await docker(['network', 'connect', `${this.name}_front`, this.container], { capture: true, allowFailure: true });
    if (result.code && !/already exists/i.test(result.stderr)) throw new Error('Cannot connect verifier to private front network');
    this.connected = true;
  }
  async disconnect() {
    if (this.connected) await docker(['network', 'disconnect', `${this.name}_front`, this.container], { capture: true, allowFailure: true });
    this.connected = false;
  }
  async request(url, { status = 200, timeout = 5000 } = {}) {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeout), redirect: 'manual' });
    if (response.status !== status) throw new Error(`${new URL(url).pathname}: expected ${status}, received ${response.status}`);
    return response;
  }
  async readiness(publicRoute = false, manifest = this.manifest) {
    await this.connect();
    const deadline = Date.now() + 180000;
    let last = 'not ready';
    while (Date.now() < deadline) {
      try {
        await this.request('http://web:8085/health');
        const response = await this.request('http://gateway:8081/api/ready');
        if ((await response.json()).status !== 'UP') throw new Error('Aggregate readiness is not UP');
        if (publicRoute) {
          const base = this.settings.cloud ? this.config.SITE_ADDRESS : 'http://web:8080';
          await this.request(`${base}/api/ready`);
          const html = await this.request(`${base}/`);
          if (!(html.headers.get('content-type') || '').includes('text/html')) throw new Error('HTML content type mismatch');
          if (sha256(Buffer.from(await html.arrayBuffer())) !== manifest.htmlSha256) throw new Error('HTML release identity mismatch');
          for (const asset of manifest.assets) {
            const response = await this.request(`${base}/${asset.path}`);
            const bytes = Buffer.from(await response.arrayBuffer());
            if (sha256(bytes) !== asset.sha256) throw new Error(`Asset content mismatch: ${asset.path}`);
            if (asset.path.endsWith('.js') && !/javascript/.test(response.headers.get('content-type') || '')) throw new Error(`Asset MIME mismatch: ${asset.path}`);
          }
          await this.request(`${base}/assets/supets-missing.js`, { status: 404 });
        }
        return;
      } catch (error) { last = error.message; await pause(Math.min(1000, Math.max(0, deadline - Date.now()))); }
    }
    throw new Error(`Readiness deadline exceeded: ${last}`);
  }
  async mode(value, manifest = this.manifest) {
    this.config.WEB_MODE = value;
    await this.saveConfig();
    await this.compose(['up', '-d', '--no-deps', '--force-recreate', '--wait', '--wait-timeout', '30', 'web'], { manifest });
  }
  async inspectImage(reference) {
    const image = JSON.parse((await docker(['image', 'inspect', reference], { capture: true })).stdout)[0];
    if (image.Os !== 'linux') throw new Error('Candidate images must use Linux containers');
    const architecture = `${image.Os}/${image.Architecture}`;
    if (architecture !== this.settings.platform) throw new Error(`Image architecture ${architecture} differs from ${this.settings.platform}`);
    return { id: image.Id, platform: architecture };
  }
  async build() {
    const releaseId = id();
    const manifest = { format: 1, id: releaseId, createdAt: new Date().toISOString(), platform: this.settings.platform, images: {}, buildImages: {}, schemas: { community: [], ocorrencias: ['5'] }, assets: [], jars: {}, evidence: [] };
    manifest.source = await sourceInventory(root);
    const snapshot = path.join(state, 'releases', releaseId, 'source');
    await stateDirectory(snapshot);
    for (const file of manifest.source.files) {
      const destination = path.join(snapshot, file.path);
      await stateDirectory(path.dirname(destination));
      const bytes = await fs.readFile(path.join(root, file.path));
      if (sha256(bytes) !== file.sha256) throw new Error(`Source changed during snapshot: ${file.path}`);
      await fs.writeFile(destination, bytes, { mode: 0o600 });
      if (process.getuid() === 0) await fs.chown(destination, 1000, 1000);
    }
    for (const service of [...services, 'web', 'postgres']) {
      const tag = `supets/${this.settings.project}-${service}:${releaseId}`;
      const file = services.includes(service) ? 'java' : service;
      const shared = ['buildx', 'build', '--load', '--platform', this.settings.platform, '-f', `deploy/Dockerfile.${file}`];
      if (services.includes(service)) shared.push('--build-arg', `SERVICE=${service}`);
      if (service !== 'postgres') {
        await docker([...shared, '--target', 'build', '-t', `${tag}-build`, '.'], { cwd: snapshot });
        manifest.buildImages[service] = await this.inspectImage(`${tag}-build`);
      }
      await docker([...shared, ...(service === 'postgres' ? [] : ['--target', 'runtime']), '-t', tag, '.'], { cwd: snapshot });
      manifest.images[service] = await this.inspectImage(tag);
    }
    await this.captureArtifacts(manifest);
    const histories = await fs.readdir(path.join(snapshot, 'microsservicos/community/src/main/resources/db/migration'));
    manifest.schemas.community = [String(Math.max(...histories.map(file => Number(/^V(\d+)__/.exec(file)?.[1] || 0))))];
    await atomicJson(path.join(this.state, 'built.json'), manifest);
    return manifest;
  }
  async matchesSource(manifest) {
    return Boolean(manifest && manifest.platform === this.settings.platform &&
      JSON.stringify(manifest.source.files) === JSON.stringify(await fileInventory(root)));
  }
  async captureArtifacts(manifest) {
    const directory = path.join(this.exports, 'artifacts', manifest.id);
    await fs.mkdir(directory, { recursive: true });
    for (const service of [...services, 'web']) {
      const container = (await docker(['create', manifest.images[service].id], { capture: true })).stdout.trim();
      try {
        const destination = path.join(directory, service);
        await fs.mkdir(destination, { recursive: true });
        await docker(['cp', `${container}:${service === 'web' ? '/srv/.' : '/app/app.jar'}`, destination]);
        if (service === 'web') {
          manifest.htmlSha256 = sha256(await fs.readFile(path.join(destination, 'index.html')));
          manifest.assets = (await fileInventory(destination)).filter(file => file.path !== 'index.html' && !file.path.startsWith('history/'));
        } else manifest.jars[service] = sha256(await fs.readFile(path.join(destination, 'app.jar')));
      } finally { await docker(['rm', container], { capture: true }); }
    }
    if (!manifest.assets.length) throw new Error('Web image contains no emitted assets');
  }
  async schemas() {
    const result = {};
    for (const service of ['community', 'ocorrencias']) {
      const query = await this.compose(['exec', '-T', `${service}-db`, 'psql', '-U', 'postgres', '-d', service, '-Atc', 'SELECT version FROM flyway_schema_history WHERE success AND version IS NOT NULL ORDER BY installed_rank DESC LIMIT 1'], { capture: true });
      result[service] = query.stdout.trim();
    }
    return result;
  }
  async deploy(manifest, { preflightComplete = false } = {}) {
    if (!preflightComplete) {
      const { preflight } = await import('./verification/releases.mjs');
      await preflight(this, manifest, { verified: false });
    }
    const previous = this.manifest;
    let assetPredecessor = previous;
    if (previous?.id === manifest.id) {
      const previousFile = path.join(this.state, 'previous.json');
      assetPredecessor = await exists(previousFile) ? await json(previousFile) : null;
    }
    try {
      if (this.settings.cloud) {
        const { prepareCloudTLS } = await import('./verification/tls.mjs');
        await prepareCloudTLS(this, previous || manifest);
      } else await this.mode('maintenance', previous || manifest);
      await this.compose(['stop', '-t', '30', 'gateway'], { manifest: previous || manifest });
      await this.compose(['stop', '-t', '30', 'community', 'ocorrencias'], { manifest: previous || manifest });
      await this.compose(['up', '-d', ...services], { manifest });
      await this.readiness(false, manifest);
      if (this.settings.cloud) await this.request(this.config.SITE_ADDRESS, { status: 503, timeout: 15000 });
      await this.retainAssets(manifest, assetPredecessor);
      await this.mode('normal', manifest);
      await this.readiness(true, manifest);
      if (previous && previous.id !== manifest.id) await atomicJson(path.join(this.state, 'previous.json'), previous);
      await atomicJson(path.join(this.state, 'current.json'), manifest);
      this.manifest = manifest;
      console.log(`Ready: ${this.settings.cloud ? this.config.SITE_ADDRESS : `http://localhost:${this.settings.port}`} (release ${manifest.id})`);
    } catch (error) {
      await this.mode('maintenance', previous || manifest).catch(() => {});
      let compatible = false;
      if (previous) {
        try { const actual = await this.schemas(); compatible = Object.entries(actual).every(([service, version]) => previous.schemas[service].includes(version)); } catch { /* Unknown schema is never rollback-compatible. */ }
      }
      if (compatible) {
        await this.compose(['stop', '-t', '30', 'gateway'], { manifest });
        await this.compose(['stop', '-t', '30', 'community', 'ocorrencias'], { manifest });
        await this.compose(['up', '-d', ...services], { manifest: previous });
        await this.readiness(false, previous);
        await this.mode('normal', previous);
        await this.readiness(true, previous);
        console.error(`Restored compatible release ${previous.id}; deployment still failed.`);
      } else console.error('Maintenance retained; no verified schema-compatible predecessor. Data preserved.');
      throw error;
    }
    // Activation is committed. A cleanup failure retains extra assets, not a mixed release.
    await this.pruneAssets(manifest, assetPredecessor).catch(error => console.error(`Release active; old-asset cleanup failed: ${error.message}`));
  }
  async retainAssets(manifest, previous) {
    // Copy only immutable hashed assets, validating any existing name before reuse.
    const wanted = [...manifest.assets, ...(previous?.assets || [])];
    const collision = new Map();
    for (const asset of wanted) {
      if (collision.has(asset.path) && collision.get(asset.path) !== asset.sha256) throw new Error(`Immutable asset collision: ${asset.path}`);
      collision.set(asset.path, asset.sha256);
    }
    await docker(['run', '--rm', '--network', 'none', '--mount', `type=volume,src=${this.name}_asset-history,dst=/history`, '--entrypoint', '/bin/sh', manifest.images.web.id, '-ec', 'find /srv -path /srv/history -prune -o -type f ! -name index.html -print | while IFS= read -r source; do relative=${source#/srv/}; destination=/history/$relative; mkdir -p \"$(dirname \"$destination\")\"; if [ -e \"$destination\" ]; then cmp \"$source\" \"$destination\"; else cp \"$source\" \"$destination\"; fi; done']);
  }
  async pruneAssets(manifest, previous) {
    const retained = new Set([...manifest.assets, ...(previous?.assets || [])].map(asset => asset.path));
    // Pruning uses the exact manifest allowlist, never a shell pattern from user input.
    const container = (await docker(['create', '--network', 'none', '--mount', `type=volume,src=${this.name}_asset-history,dst=/history`, '--entrypoint', '/bin/sh', manifest.images.web.id, '-ec', 'find /history -type f'], { capture: true })).stdout.trim();
    try {
      const listed = await docker(['start', '-a', container], { capture: true });
      const obsolete = listed.stdout.trim().split('\n').filter(Boolean).filter(file => !retained.has(file.replace('/history/', '')));
      if (obsolete.length) await docker(['run', '--rm', '--network', 'none', '--mount', `type=volume,src=${this.name}_asset-history,dst=/history`, '--entrypoint', 'rm', manifest.images.web.id, '--', ...obsolete]);
    } finally { await docker(['rm', container], { capture: true }); }
  }
  async exportOwnership() {
    if (process.env.SUPETS_HOST_OS === 'windows' || process.env.SUPETS_ROOTLESS === 'true' || process.getuid() !== 0) return;
    const uid = Number(process.env.SUPETS_CALLER_UID), gid = Number(process.env.SUPETS_CALLER_GID);
    if (!Number.isInteger(uid) || !Number.isInteger(gid)) return;
    const visit = async directory => { for (const entry of await fs.readdir(directory, { withFileTypes: true })) { const file = path.join(directory, entry.name); if (entry.isDirectory()) await visit(file); if (!entry.isSymbolicLink()) await fs.chown(file, uid, gid); } await fs.chown(directory, uid, gid); };
    await visit(this.exports);
  }
}

const excluded = new Set(['.git', '.supets', 'node_modules', 'target', 'dist', '.idea', '.vscode']);
export async function fileInventory(directory, prefix = '') {
  const files = [];
  for (const entry of (await fs.readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (excluded.has(entry.name) || entry.name !== '.env.example' && /^\.env(?:\.|$)/.test(entry.name) || /\.(?:pem|key|log)$/.test(entry.name)) continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Symlink unsupported in release source: ${relative}`);
    if (entry.isDirectory()) files.push(...await fileInventory(path.join(directory, entry.name), relative));
    else if (entry.isFile()) files.push({ path: relative, sha256: sha256(await fs.readFile(path.join(directory, entry.name))) });
  }
  return files;
}
async function sourceInventory(directory) {
  let baseCommit = null;
  const head = path.join(directory, '.git/HEAD');
  if (await exists(head)) {
    const value = (await fs.readFile(head, 'utf8')).trim();
    if (!value.startsWith('ref: ')) baseCommit = value;
    else {
      const reference = value.slice(5);
      const loose = path.join(directory, '.git', reference);
      if (await exists(loose)) baseCommit = (await fs.readFile(loose, 'utf8')).trim();
      else if (await exists(path.join(directory, '.git/packed-refs'))) baseCommit = (await fs.readFile(path.join(directory, '.git/packed-refs'), 'utf8')).split('\n').find(line => line.endsWith(` ${reference}`))?.split(' ')[0] || null;
    }
  }
  return { baseCommit, description: 'Exact working-tree files; base commit alone does not identify these changes', files: await fileInventory(directory) };
}

async function main() {
  const settings = options(process.argv.slice(2));
  const project = new Project(settings);
  const mutating = !['status', 'logs'].includes(settings.command);
  try {
    await project.initialize();
    if (mutating) await project.acquire();
    if (settings.command === 'up') {
      await project.loadConfig(true);
      const manifest = await project.matchesSource(project.manifest) ? project.manifest : await project.build();
      await project.deploy(manifest);
    }
    else if (['down', 'status', 'logs'].includes(settings.command)) {
      await project.loadConfig();
      if (settings.command === 'down') {
        await project.ci(['down', '--timeout', '30']);
        await project.compose(['down', '--timeout', '30']);
      } else if (settings.command === 'status') await project.compose(['ps']);
      else if (settings.positional[0] === 'jenkins') {
        if (!await project.ci(['logs', '--tail', '200', 'jenkins'])) throw new Error('Optional Jenkins has not been initialized');
      } else await project.compose(['logs', '--tail', '200', ...settings.positional]);
    } else {
      const { execute } = await import('./verification/lifecycle.mjs');
      await execute(project);
    }
  } finally {
    await project.disconnect();
    if (mutating) await project.releaseLock();
    await project.exportOwnership();
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(`SuPets: ${error.message}`); process.exitCode = 1; });
