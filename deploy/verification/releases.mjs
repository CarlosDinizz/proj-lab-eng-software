import * as fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { docker, run, stateDirectory, writeJson, atomicJson, fileInventory } from '../supets.mjs';

export const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
export const STATE = '/state';
export const exists = file => fs.access(file).then(() => true, () => false);
export const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export const identifier = value => typeof value === 'string' && /^[a-z0-9][a-z0-9_-]*$/.test(value);
export const releaseDirectory = id => {
  if (!identifier(id)) throw new Error('Invalid release identifier');
  return path.join(STATE, 'releases', id);
};
export async function hashFile(file) {
  const hash = createHash('sha256');
  const handle = await fs.open(file, 'r');
  try { for await (const bytes of handle.createReadStream({ autoClose: false })) hash.update(bytes); }
  finally { await handle.close(); }
  return hash.digest('hex');
}
export function safePath(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || /[\x00-\x1f\x7f]/.test(value) || value.startsWith('/') || /^[a-z]:/i.test(value) || value.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Unsafe archive or manifest path');
  return value;
}
function inventory(value, label) {
  if (!Array.isArray(value) || !value.length) throw new Error(`Missing ${label} inventory`);
  const seen = new Set();
  for (const file of value) {
    safePath(file.path);
    if (seen.has(file.path) || !/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error(`Invalid ${label} inventory`);
    seen.add(file.path);
  }
}
export function validateManifest(manifest, platform) {
  if (manifest?.format !== 1 || !identifier(manifest.id) || !['linux/amd64', 'linux/arm64'].includes(manifest.platform) || platform && manifest.platform !== platform) throw new Error('Invalid release format, identifier or architecture');
  for (const [group, names] of [['images', ['gateway', 'community', 'ocorrencias', 'web', 'postgres']], ['buildImages', ['gateway', 'community', 'ocorrencias', 'web']]]) {
    if (Object.keys(manifest[group] || {}).sort().join(',') !== [...names].sort().join(',')) throw new Error(`Unexpected ${group} inventory`);
    for (const name of names) {
      const image = manifest[group][name];
      if (!/^sha256:[a-f0-9]{64}$/.test(image?.id) || image.platform !== manifest.platform) throw new Error(`Invalid frozen ${name} image`);
    }
  }
  for (const service of ['gateway', 'community', 'ocorrencias']) if (!/^[a-f0-9]{64}$/.test(manifest.jars?.[service])) throw new Error('Invalid JAR inventory');
  if (!/^[a-f0-9]{64}$/.test(manifest.htmlSha256)) throw new Error('Missing current HTML identity');
  for (const service of ['community', 'ocorrencias']) if (!Array.isArray(manifest.schemas?.[service]) || !manifest.schemas[service].length || !manifest.schemas[service].every(version => typeof version === 'string' && /^\d+(?:\.\d+)*$/.test(version))) throw new Error('Missing supported schema versions');
  inventory(manifest.source?.files, 'source');
  inventory(manifest.assets, 'asset');
  for (const file of manifest.source.files) if (file.path.split('/').some(part => ['.git', '.supets', 'node_modules', 'target', 'dist'].includes(part) || part.startsWith('.env') && part !== '.env.example') || /\.(?:pem|key|log)$/.test(file.path)) throw new Error('Private or generated file in release source');
  for (const asset of manifest.assets) if (asset.path === 'index.html' || asset.path === 'history' || asset.path.startsWith('history/')) throw new Error('Reserved path in emitted static inventory');
  if (!manifest.source.files.some(file => file.path === 'supets.sh') || !manifest.source.files.some(file => file.path === 'supets.ps1')) throw new Error('Portable launchers missing from source');
  if (!Array.isArray(manifest.evidence)) throw new Error('Invalid release evidence');
  return manifest;
}
export function fingerprint(manifest) {
  // Verification is bound to bytes/images, not mutable evidence or timestamps.
  return digest(JSON.stringify({ platform: manifest.platform, images: manifest.images, buildImages: manifest.buildImages, jars: manifest.jars, htmlSha256: manifest.htmlSha256, assets: manifest.assets, source: manifest.source, schemas: manifest.schemas }));
}
async function allFiles(directory, prefix = '') {
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    safePath(relative);
    if (entry.isSymbolicLink() || !entry.isDirectory() && !entry.isFile()) throw new Error('Links and special files are forbidden in release source');
    if (entry.isDirectory()) result.push(...await allFiles(path.join(directory, entry.name), relative));
    else result.push(relative);
  }
  return result;
}
export async function validateSource(manifest, directory = path.join(releaseDirectory(manifest.id), 'source')) {
  const actual = (await allFiles(directory)).sort();
  const expected = manifest.source.files.map(file => file.path).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Frozen source file inventory differs from manifest');
  for (const file of manifest.source.files) if (await hashFile(path.join(directory, file.path)) !== file.sha256) throw new Error(`Frozen source hash mismatch: ${file.path}`);
}
export async function validateImages(project, manifest) {
  validateManifest(manifest, project.settings.platform);
  for (const image of [...Object.values(manifest.images), ...Object.values(manifest.buildImages)]) {
    if ((await project.inspectImage(image.id)).id !== image.id) throw new Error('Frozen image ID changed');
  }
  const temporary = path.join(STATE, 'inspection', randomUUID());
  await stateDirectory(temporary);
  try {
    for (const service of ['gateway', 'community', 'ocorrencias', 'web']) {
      const container = (await docker(['create', '--network', 'none', manifest.images[service].id], { capture: true })).stdout.trim();
      const destination = path.join(temporary, service);
      await fs.mkdir(destination);
      try { await docker(['cp', `${container}:${service === 'web' ? '/srv/.' : '/app/app.jar'}`, destination], { capture: true }); }
      finally { await docker(['rm', container], { capture: true }); }
      if (service === 'web') {
        if (await hashFile(path.join(destination, 'index.html')) !== manifest.htmlSha256) throw new Error('Frozen current HTML hash mismatch');
        const actual = (await fileInventory(destination)).filter(file => file.path !== 'index.html' && !file.path.startsWith('history/')).sort((a, b) => a.path.localeCompare(b.path));
        const expected = [...manifest.assets].sort((a, b) => a.path.localeCompare(b.path));
        if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Frozen web asset inventory/hash mismatch');
      } else if (await hashFile(path.join(destination, 'app.jar')) !== manifest.jars[service]) throw new Error(`Frozen ${service} JAR hash mismatch`);
    }
  } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}
export function requireEvidence(manifest) {
  const bound = manifest.evidence.filter(item => item?.passed === true && item.fingerprint === fingerprint(manifest));
  if (!bound.some(item => item.kind === 'frozen-image-unit-and-postgresql-tests') || !bound.some(item => item.kind === 'isolated-runtime-api-probes')) throw new Error('Release requires passing isolated tests and runtime API probes on these exact source/image/JAR/asset hashes; run verify first');
}
async function ownTree(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await ownTree(file);
    await fs.chmod(file, entry.isDirectory() ? 0o700 : 0o600);
    if (process.getuid() === 0) await fs.chown(file, 1000, 1000);
  }
  await fs.chmod(directory, 0o700);
  if (process.getuid() === 0) await fs.chown(directory, 1000, 1000);
}

// Only our portable, uncompressed USTAR envelope is accepted. No extraction is
// delegated to tar: links, PAX overrides, duplicate paths and special files fail
// before any archive content is written.
async function scanTar(file) {
  const handle = await fs.open(file, 'r');
  const size = (await handle.stat()).size;
  const entries = [], names = new Set();
  let offset = 0, zeros = 0;
  const text = bytes => bytes.toString('utf8').replace(/\0.*$/s, '');
  const octal = bytes => {
    const value = text(bytes).trim();
    if (!/^[0-7]+$/.test(value)) throw new Error('Unsupported tar numeric encoding');
    const number = Number.parseInt(value, 8);
    if (!Number.isSafeInteger(number) || number < 0) throw new Error('Invalid tar size');
    return number;
  };
  try {
    while (offset + 512 <= size) {
      const header = Buffer.alloc(512);
      await handle.read(header, 0, 512, offset);
      if (header.every(byte => byte === 0)) { zeros++; offset += 512; continue; }
      if (zeros) throw new Error('Data after tar end marker');
      const sum = header.reduce((total, byte, index) => total + (index >= 148 && index < 156 ? 32 : byte), 0);
      if (sum !== octal(header.subarray(148, 156)) || text(header.subarray(257, 263)) !== 'ustar') throw new Error('Invalid portable tar header');
      const type = String.fromCharCode(header[156]);
      if (!['0', '\0', '5'].includes(type) || text(header.subarray(157, 257))) throw new Error('Archive links/extensions/special files are forbidden');
      const prefix = text(header.subarray(345, 500));
      let name = `${prefix ? `${prefix}/` : ''}${text(header.subarray(0, 100))}`;
      if (type === '5') name = name.replace(/\/$/, '');
      safePath(name);
      if (names.has(name)) throw new Error('Duplicate archive path');
      names.add(name);
      const length = octal(header.subarray(124, 136));
      if (type === '5' && length) throw new Error('Invalid archive directory');
      if (offset + 512 + length > size) throw new Error('Truncated archive');
      entries.push({ path: name, size: length, directory: type === '5', offset: offset + 512 });
      offset += 512 + Math.ceil(length / 512) * 512;
      if (entries.length > 200000) throw new Error('Archive entry limit exceeded');
    }
    if (zeros < 2 || offset !== size) throw new Error('Missing tar end marker or truncated archive');
    const files = new Set(entries.filter(entry => !entry.directory).map(entry => entry.path));
    for (const entry of entries) {
      let parent = path.posix.dirname(entry.path);
      while (parent !== '.') {
        if (files.has(parent)) throw new Error('Archive path traverses a file');
        parent = path.posix.dirname(parent);
      }
    }
    return entries;
  } finally { await handle.close(); }
}
async function extractTar(file, directory, entries) {
  const source = await fs.open(file, 'r');
  const buffer = Buffer.alloc(1024 * 1024);
  try {
    for (const entry of entries) {
      const target = path.join(directory, entry.path);
      await fs.mkdir(entry.directory ? target : path.dirname(target), { recursive: true, mode: 0o700 });
      if (entry.directory) continue;
      const destination = await fs.open(target, 'wx', 0o600);
      try {
        let copied = 0;
        while (copied < entry.size) {
          const { bytesRead } = await source.read(buffer, 0, Math.min(buffer.length, entry.size - copied), entry.offset + copied);
          if (!bytesRead) throw new Error('Truncated archive payload');
          await destination.writeFile(buffer.subarray(0, bytesRead));
          copied += bytesRead;
        }
      } finally { await destination.close(); }
    }
  } finally { await source.close(); }
}
async function verifyEnvelope(project, id, directory) {
  const candidate = path.join(directory, '.supets', project.settings.project, 'candidates', id);
  const manifest = validateManifest(await readJson(path.join(candidate, 'manifest.json')), project.settings.platform);
  if (manifest.id !== id) throw new Error('Candidate identifier mismatch');
  const envelope = await readJson(path.join(candidate, 'archive.json'));
  if (envelope.format !== 1 || envelope.manifestSha256 !== await hashFile(path.join(candidate, 'manifest.json')) || envelope.imagesSha256 !== await hashFile(path.join(candidate, 'images.tar'))) throw new Error('Candidate archive manifest/image checksum mismatch');
  const expected = [...manifest.source.files.map(file => file.path), ...['manifest.json', 'images.tar', 'archive.json'].map(file => `.supets/${project.settings.project}/candidates/${id}/${file}`)].sort();
  if (JSON.stringify((await allFiles(directory)).sort()) !== JSON.stringify(expected)) throw new Error('Unexpected or missing candidate envelope files');
  for (const file of manifest.source.files) if (await hashFile(path.join(directory, file.path)) !== file.sha256) throw new Error(`Imported source hash mismatch: ${file.path}`);
  requireEvidence(manifest);
  return { manifest, candidate };
}
async function hydrateStoredImages(project, manifest, directory) {
  const archive = path.join(directory, 'images.tar');
  if (!await exists(archive)) return;
  const envelope = await readJson(path.join(directory, 'archive.json'));
  if (envelope.format !== 1 || envelope.manifestSha256 !== await hashFile(path.join(directory, 'manifest.json')) || envelope.imagesSha256 !== await hashFile(archive)) throw new Error('Stored release archive checksum mismatch');
  const ids = [...new Set([...Object.values(manifest.images), ...Object.values(manifest.buildImages)].map(image => image.id))];
  const inspected = await docker(['image', 'inspect', ...ids], { capture: true, allowFailure: true });
  if (inspected.code) await docker(['image', 'load', '--input', archive], { capture: true });
}
export async function candidate(project, id, { forceImport = false } = {}) {
  const destination = releaseDirectory(id);
  if (!forceImport && await exists(path.join(destination, 'manifest.json'))) {
    const manifest = validateManifest(await readJson(path.join(destination, 'manifest.json')), project.settings.platform);
    if (manifest.id !== id) throw new Error('Stored release identifier mismatch');
    await validateSource(manifest);
    await hydrateStoredImages(project, manifest, destination);
    await validateImages(project, manifest);
    requireEvidence(manifest);
    return manifest;
  }
  const archive = path.join(project.exports, 'candidates', `${id}.tar`);
  const temporary = path.join(STATE, 'imports', randomUUID());
  await stateDirectory(temporary);
  try {
    if (await exists(archive)) {
      const checksum = (await fs.readFile(`${archive}.sha256`, 'utf8')).trim();
      const match = /^([a-f0-9]{64})  ([a-z0-9_-]+\.tar)$/.exec(checksum);
      if (!match || match[2] !== `${id}.tar` || match[1] !== await hashFile(archive)) throw new Error('Transferred candidate SHA256 mismatch; refusing extraction');
      const entries = await scanTar(archive);
      const stat = await fs.statfs(STATE);
      const required = entries.reduce((sum, entry) => sum + entry.size, 0);
      if (stat.bavail * stat.bsize < required + 256 * 1024 * 1024) throw new Error('Insufficient candidate import space');
      await extractTar(archive, temporary, entries);
    } else {
      // An already extracted, externally checksum-verified portable bundle.
      const extracted = path.join(project.exports, 'candidates', id);
      if (!await exists(path.join(extracted, 'manifest.json'))) throw new Error(`Candidate ${id} not found in shared state or workspace`);
      const proposed = validateManifest(await readJson(path.join(extracted, 'manifest.json')), project.settings.platform);
      for (const file of proposed.source.files) {
        let original = ROOT;
        const components = file.path.split('/');
        for (const [index, component] of components.entries()) {
          original = path.join(original, component);
          const stat = await fs.lstat(original);
          if (stat.isSymbolicLink() || (index === components.length - 1 ? !stat.isFile() : !stat.isDirectory())) throw new Error('Extracted bundle contains a source link or nonregular file');
        }
        await fs.mkdir(path.dirname(path.join(temporary, file.path)), { recursive: true });
        await fs.copyFile(original, path.join(temporary, file.path));
      }
      await fs.cp(extracted, path.join(temporary, '.supets', project.settings.project, 'candidates', id), { recursive: true, dereference: false });
    }
    const imported = await verifyEnvelope(project, id, temporary);
    if (await exists(path.join(destination, 'manifest.json')) && JSON.stringify(await readJson(path.join(destination, 'manifest.json'))) !== JSON.stringify(imported.manifest)) throw new Error('Conflicting contents for existing release identifier');
    if (await exists(path.join(destination, 'archive.json')) && JSON.stringify(await readJson(path.join(destination, 'archive.json'))) !== JSON.stringify(await readJson(path.join(imported.candidate, 'archive.json')))) throw new Error('Conflicting image archive for existing release identifier');
    await docker(['image', 'load', '--input', path.join(imported.candidate, 'images.tar')], { capture: true });
    await validateImages(project, imported.manifest);
    if (await exists(destination)) {
      // A failed/unfinished build must never be overwritten by an import.
      await validateSource(imported.manifest, path.join(destination, 'source'));
    } else await stateDirectory(destination);
    const source = path.join(destination, 'source');
    if (!await exists(source)) {
      await stateDirectory(source);
      for (const file of imported.manifest.source.files) {
        const target = path.join(source, file.path);
        await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
        await fs.copyFile(path.join(temporary, file.path), target);
      }
    }
    await fs.copyFile(path.join(imported.candidate, 'images.tar'), path.join(destination, 'images.tar'));
    await fs.copyFile(path.join(imported.candidate, 'archive.json'), path.join(destination, 'archive.json'));
    await writeJson(path.join(destination, 'manifest.json'), imported.manifest);
    await ownTree(destination);
    return imported.manifest;
  } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}
export const importArchive = (project, id) => candidate(project, id, { forceImport: true });
export async function freezeVerified(manifest) {
  const directory = releaseDirectory(manifest.id);
  const file = path.join(directory, 'manifest.json');
  await validateSource(manifest);
  if (await exists(file)) {
    if (JSON.stringify(await readJson(file)) !== JSON.stringify(manifest)) throw new Error('Immutable release manifest conflict');
  } else await writeJson(file, manifest);
  await atomicJson(path.join(STATE, 'verified.json'), { id: manifest.id, manifestSha256: await hashFile(file), fingerprint: fingerprint(manifest) });
}
export async function latestVerified(project) {
  const verified = await readJson(path.join(STATE, 'verified.json')).catch(() => { throw new Error('No verified release; run verify first'); });
  const manifestFile = path.join(releaseDirectory(verified.id), 'manifest.json');
  if (await hashFile(manifestFile) !== verified.manifestSha256) throw new Error('Verified manifest checksum mismatch');
  const manifest = validateManifest(await readJson(manifestFile), project.settings.platform);
  requireEvidence(manifest);
  if (verified.fingerprint !== fingerprint(manifest)) throw new Error('Verified content fingerprint mismatch');
  await validateSource(manifest);
  await validateImages(project, manifest);
  return manifest;
}
export async function packageRelease(project, manifest) {
  requireEvidence(manifest);
  const directory = releaseDirectory(manifest.id);
  const staging = path.join(STATE, 'packages', randomUUID());
  await stateDirectory(staging);
  const outputDirectory = path.join(project.exports, 'candidates');
  await fs.mkdir(outputDirectory, { recursive: true, mode: 0o700 });
  const output = path.join(outputDirectory, `${manifest.id}.tar`);
  try {
    for (const file of manifest.source.files) {
      const target = path.join(staging, file.path);
      await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
      await fs.copyFile(path.join(directory, 'source', file.path), target);
    }
    const nested = path.join(staging, '.supets', project.settings.project, 'candidates', manifest.id);
    await fs.mkdir(nested, { recursive: true, mode: 0o700 });
    await fs.copyFile(path.join(directory, 'manifest.json'), path.join(nested, 'manifest.json'));
    const images = [...new Set([...Object.values(manifest.images), ...Object.values(manifest.buildImages)].map(image => image.id))];
    await docker(['image', 'save', '--output', path.join(nested, 'images.tar'), ...images], { capture: true });
    const envelope = { format: 1, manifestSha256: await hashFile(path.join(nested, 'manifest.json')), imagesSha256: await hashFile(path.join(nested, 'images.tar')) };
    await writeJson(path.join(nested, 'archive.json'), envelope);
    await verifyEnvelope(project, manifest.id, staging);
    const list = (await allFiles(staging)).sort().join('\0') + '\0';
    const partial = `${output}.${randomUUID()}.new`;
    try {
      await run('tar', ['--create', '--format=ustar', '--owner=0', '--group=0', '--mode=u+rwX,go-rwx', '--null', '--verbatim-files-from', '--no-recursion', '--files-from=-', '--file', partial], { cwd: staging, input: list, capture: true });
      // Recheck exactly what will be transferred, not a source-only assertion.
      await scanTar(partial);
      const sum = await hashFile(partial);
      if (await exists(output)) {
        if (!await exists(`${output}.sha256`) || (await fs.readFile(`${output}.sha256`, 'utf8')).split(' ')[0] !== await hashFile(output)) throw new Error('Existing candidate archive is corrupt; refusing overwrite');
        // docker save/tar metadata is not byte-reproducible. Keep the first immutable archive.
        const existing = await scanTar(output);
        const check = path.join(STATE, 'packages', randomUUID());
        await stateDirectory(check);
        try { await extractTar(output, check, existing); const prior = await verifyEnvelope(project, manifest.id, check); if (JSON.stringify(prior.manifest) !== JSON.stringify(manifest)) throw new Error('Conflicting existing release archive'); }
        finally { await fs.rm(check, { recursive: true, force: true }); }
      } else {
        await fs.rename(partial, output);
        await fs.chmod(output, 0o600);
        await fs.writeFile(`${output}.sha256`, `${sum}  ${manifest.id}.tar\n`, { mode: 0o600 });
      }
    } finally { await fs.rm(partial, { force: true }); }
    if (!await exists(path.join(directory, 'images.tar'))) await fs.copyFile(path.join(nested, 'images.tar'), path.join(directory, 'images.tar'));
    if (!await exists(path.join(directory, 'archive.json'))) await writeJson(path.join(directory, 'archive.json'), envelope);
    await ownTree(directory);
    console.log(`Release: ${path.relative(ROOT, output)} (transfer with .sha256; no secrets included)`);
    return { archive: output, sha256: await hashFile(output), manifest };
  } finally { await fs.rm(staging, { recursive: true, force: true }); }
}
export async function preflight(project, manifest, { verified = false } = {}) {
  validateManifest(manifest, project.settings.platform);
  await validateSource(manifest);
  await validateImages(project, manifest);
  if (verified) requireEvidence(manifest);
  await project.compose(['config', '--quiet'], { manifest, capture: true });
  const disk = await fs.statfs(STATE);
  if (disk.bavail * disk.bsize < 256 * 1024 * 1024) throw new Error('Insufficient deployment state space');
  // Any colliding resource must be proven to belong to this project, not just
  // happen to share a Compose name. No adoption/removal of unrelated resources.
  for (const kind of ['container', 'network', 'volume']) {
    const args = kind === 'container' ? ['ps', '-aq', '--filter', `label=com.docker.compose.project=${project.name}`] : [kind, 'ls', '-q', '--filter', `label=com.docker.compose.project=${project.name}`];
    const ids = (await docker(args, { capture: true })).stdout.trim().split('\n').filter(Boolean);
    for (const value of ids) {
      const inspected = JSON.parse((await docker([kind === 'container' ? 'inspect' : kind, ...(kind === 'container' ? [] : ['inspect']), value], { capture: true })).stdout)[0];
      const labels = inspected.Config?.Labels || inspected.Labels || {};
      if (labels['com.supets.managed'] !== 'true' || labels['com.supets.project'] !== project.settings.project) throw new Error('Project resources belong to another owner; no changes made');
    }
  }
  for (const [kind, names] of [['network', ['front', 'services', 'community-data', 'ocorrencias-data']], ['volume', ['community-data', 'ocorrencias-data', 'caddy-data', 'caddy-config', 'asset-history']]]) {
    for (const name of names) {
      const result = await docker([kind, 'inspect', `${project.name}_${name}`], { capture: true, allowFailure: true });
      if (result.code) {
        if (!/(?:no such (?:network|volume)|network .+ not found|volume .+ not found)/i.test(result.stderr)) throw new Error('Cannot establish ownership of existing named resources');
        continue;
      }
      const labels = JSON.parse(result.stdout)[0].Labels || {};
      if (labels['com.supets.managed'] !== 'true' || labels['com.supets.project'] !== project.settings.project) throw new Error('Named project resource already belongs to another owner');
    }
  }
  const running = (await docker(['ps', '--format', '{{json .}}'], { capture: true })).stdout.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  for (const container of running) {
    const inspected = JSON.parse((await docker(['inspect', container.ID], { capture: true })).stdout)[0];
    const ports = Object.values(inspected.NetworkSettings?.Ports || {}).flat().filter(Boolean);
    const wanted = project.settings.cloud ? ['80', '443'] : [String(project.settings.port)];
    if (ports.some(port => wanted.includes(port.HostPort)) && inspected.Config.Labels?.['com.supets.project'] !== project.settings.project) throw new Error('Requested public port belongs to another container');
  }
  // Docker binds detect host daemons too. A short-lived, networkless reservation
  // is only needed for ports not already published by this project's web.
  const ownWeb = (await project.compose(['ps', '-q', 'web'], { manifest, capture: true })).stdout.trim();
  if (!ownWeb) {
    const ports = project.settings.cloud ? ['0.0.0.0:80:18080', '0.0.0.0:443:18443'] : [`127.0.0.1:${project.settings.port}:18080`];
    const name = `${project.name}-portcheck-${randomUUID()}`;
    try { await docker(['run', '-d', '--name', name, '--label', 'com.supets.ephemeral=true', '--network', 'bridge', ...ports.flatMap(port => ['-p', port]), '--entrypoint', '/bin/sh', manifest.images.web.id, '-c', 'sleep 20'], { capture: true, timeout: 30000 }); }
    finally { await docker(['rm', '-f', name], { capture: true, allowFailure: true }); }
  }
}
