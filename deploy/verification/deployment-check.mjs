import * as fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { Project, docker, run, stateDirectory, writeJson, atomicJson } from '../supets.mjs';
import { STATE, digest, exists, fingerprint, hashFile, importArchive, preflight, readJson, releaseDirectory, validateImages } from './releases.mjs';
import { backup, captureDatabaseState, assertDatabaseState, restoreCheck, checkPasswordRotation } from './backups.mjs';

function assert(value, message) { if (!value) throw new Error(message); }
async function expectFailure(action, label, expected) {
  try { await action(); }
  catch (error) {
    if (expected && !expected.test(error.message)) throw new Error(`Fault did not reach its expected checkpoint (${label}): ${error.message}`);
    return;
  }
  throw new Error(`Fault acceptance unexpectedly succeeded: ${label}`);
}
async function webContainer(project) {
  const id = (await project.compose(['ps', '-q', 'web'], { capture: true })).stdout.trim();
  if (!id) throw new Error('Disposable web is not running');
  return id;
}
async function publicationAudit(project) {
  const ids = (await project.compose(['ps', '-aq'], { capture: true })).stdout.trim().split('\n').filter(Boolean);
  assert(ids.length === 6, 'Disposable deployment does not have all six containers');
  for (const id of ids) {
    const container = JSON.parse((await docker(['inspect', id], { capture: true })).stdout)[0];
    assert(container.Config.Labels?.['com.supets.managed'] === 'true' && container.Config.Labels?.['com.supets.project'] === project.settings.project, 'Unexpected container ownership in disposable deployment');
    const service = container.Config.Labels['com.docker.compose.service'];
    const published = Object.values(container.NetworkSettings.Ports || {}).flat().filter(Boolean);
    if (service !== 'web') assert(published.length === 0, `Private ${service} port is publicly published`);
    else assert(published.length === 1 && published[0].HostIp === '127.0.0.1', 'Local web publication is not loopback-only');
    assert(!(container.Mounts || []).some(mount => mount.Destination === '/state' || mount.Destination.includes('docker.sock')), 'Runtime container has privileged control-state/socket mount');
    const environment = container.Config.Env || [];
    if (service === 'gateway' || service === 'web') assert(!environment.some(value => /^(?:COMMUNITY|OCORRENCIAS)_DB_|^SPRING_DATASOURCE_|^POSTGRES_PASSWORD=/.test(value)), 'Web/gateway has database credentials');
    if (service === 'web') assert(!environment.some(value => /^JWT_SECRET=/.test(value)), 'Web has JWT signing secret');
  }
}
function document(length, weights) {
  const digits = Array.from(randomBytes(length), byte => byte % 10);
  for (const weight of weights) {
    const remainder = digits.reduce((sum, digit, index) => sum + digit * weight[index], 0) % 11;
    digits.push(remainder < 2 ? 0 : 11 - remainder);
  }
  return digits.join('');
}
async function seedPreservationRows(project) {
  // Explicit synthetic SQL fixtures belong ONLY to this fresh disposable project.
  // They exercise retained identifiers and both local/cross-service relationships,
  // not a fabricated end-user/browser acceptance result.
  const citizen = randomUUID(), ong = randomUUID(), campaign = randomUUID(), animal = randomUUID(), occurrence = randomUUID();
  const cpf = document(9, [[10,9,8,7,6,5,4,3,2], [11,10,9,8,7,6,5,4,3,2]]);
  const cnpj = document(12, [[5,4,3,2,9,8,7,6,5,4,3,2], [6,5,4,3,2,9,8,7,6,5,4,3,2]]);
  const community = `BEGIN;
INSERT INTO cidadao(id,nome,cpf,cep,endereco,municipio,estado,email,senha_hash) VALUES ('${citizen}','SYNTHETIC deployment fixture','${cpf}','01001000','Praça da Sé','São Paulo','SP','${citizen}@example.invalid','not-a-login-hash');
INSERT INTO ong(id,nome,cnpj,cep,endereco,municipio,estado,email,senha_hash) VALUES ('${ong}','SYNTHETIC deployment fixture','${cnpj}','01001000','Praça da Sé','São Paulo','SP','${ong}@example.invalid','not-a-login-hash');
INSERT INTO campanha(id,titulo,descricao,data_inicio,data_fim,tipo_campanha_id,ong_id,cep,endereco,cidade,estado) VALUES ('${campaign}','Synthetic backup fixture','Not a public account or workflow proof',CURRENT_DATE,CURRENT_DATE+1,(SELECT min(id) FROM tipo_campanha),'${ong}','01001000','Praça da Sé','São Paulo','SP');
INSERT INTO participacao_campanha(campanha_id,cidadao_id) VALUES ('${campaign}','${citizen}');
COMMIT;`;
  const ocorrencias = `BEGIN;
INSERT INTO animal(id,nome,especie_id,sexo_id,porte_id) VALUES ('${animal}','Synthetic backup animal',(SELECT min(id) FROM especie),(SELECT min(id) FROM sexo_animal),(SELECT min(id) FROM porte));
INSERT INTO ocorrencia(id,tipo_ocorrencia_id,cidadao_id,titulo,descricao,status,responsavel_id,responsavel_perfil,created_at,endereco,cidade,estado,animal_id,data_ocorrido,cep,lat,lon) VALUES ('${occurrence}',(SELECT min(id) FROM tipo_ocorrencia),'${citizen}','Synthetic preservation fixture','Not a public workflow proof','EM_ANDAMENTO','${ong}','ONG',CURRENT_TIMESTAMP,'Praça da Sé','São Paulo','SP','${animal}',CURRENT_DATE,'01001000',-23.5505,-46.6333);
COMMIT;`;
  for (const [service, input] of [['community', community], ['ocorrencias', ocorrencias]]) await project.compose(['exec', '-T', `${service}-db`, 'psql', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', service], { input, capture: true });
  return { citizen, ong, campaign, animal, occurrence };
}
async function outage(project, service) {
  await project.compose(['stop', '-t', '30', service], { capture: true });
  try {
    if (service === 'web') {
      let unavailable = false;
      try { await project.request('http://web:8080/api/ready', { timeout: 4000 }); } catch { unavailable = true; }
      assert(unavailable, 'Stopped web still serves public readiness');
    } else {
      const started = Date.now();
      const response = await fetch('http://web:8080/api/ready', { signal: AbortSignal.timeout(5000), redirect: 'manual' });
      assert([502, 503].includes(response.status), `${service} outage did not propagate public unavailability`);
      assert(Date.now() - started < 5000, 'Readiness outage propagation exceeded five seconds');
      if (service !== 'gateway') {
        assert(response.status === 503, 'Live gateway did not aggregate backend/DB DOWN as 503');
        const body = await response.json();
        const component = service.replace(/-db$/, '');
        assert(body.status === 'DOWN' && body.components?.[component] === 'DOWN', 'Aggregate DOWN component is untruthful');
        await project.request('http://gateway:8081/api/status');
      }
    }
  } finally {
    await project.compose(['up', '-d', service], { capture: true });
    await project.readiness(true);
  }
  return { service, passed: true };
}
async function activationFailure(project, manifest) {
  const mode = project.mode.bind(project), readiness = project.readiness.bind(project);
  let armed = true, paused;
  project.mode = async (value, target) => {
    await mode(value, target);
    if (value === 'normal' && armed) {
      armed = false;
      paused = await webContainer(project);
      await docker(['pause', paused], { capture: true });
    }
  };
  project.readiness = async (publicRoute, target) => {
    if (publicRoute && paused) {
      const container = paused; paused = null;
      try { await project.request('http://web:8080/api/ready', { timeout: 3000 }); }
      finally { await docker(['unpause', container], { capture: true, allowFailure: true }); }
      throw new Error('Paused web unexpectedly answered public readiness');
    }
    return readiness(publicRoute, target);
  };
  try { await expectFailure(() => project.deploy(manifest), 'actual paused-web activation'); assert(!armed, 'Activation fault never reached the public phase'); }
  finally {
    if (paused) await docker(['unpause', paused], { capture: true, allowFailure: true });
    project.mode = mode; project.readiness = readiness;
  }
}
async function lockScenarios(project) {
  const contender = new Project({ ...project.settings, command: 'verify-deploy' });
  await expectFailure(() => contender.acquire(), 'concurrent project lock');
  // Kill a real live invocation owner; recovery must use Docker/process metadata.
  const dead = (await docker(['run', '-d', '--network', 'none', '--entrypoint', '/bin/sh', project.manifest.images.web.id, '-c', 'sleep 300'], { capture: true })).stdout.trim();
  try {
    const stat = (await docker(['exec', dead, 'cat', '/proc/1/stat'], { capture: true })).stdout;
    const start = stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19];
    await project.releaseLock();
    await writeJson(path.join(project.state, 'operation.lock'), { container: dead, pid: 1, start, uuid: randomUUID() });
    await expectFailure(() => contender.acquire(), 'live invocation owner recovery refusal');
    await docker(['kill', dead], { capture: true });
    await project.acquire();
    assert(project.owner.container && project.owner.uuid, 'Killed invocation lock was not replaced');
  } finally { await docker(['rm', '-f', dead], { capture: true, allowFailure: true }); }
}

async function importFaults(project, manifest, suffix) {
  const staging = path.join(project.state, 'import-fixtures');
  const output = path.join(project.exports, 'candidates');
  await stateDirectory(staging);
  await fs.mkdir(output, { recursive: true, mode: 0o700 });
  const proposed = structuredClone(manifest);
  proposed.id = `accept-${suffix}-invalid-save`;
  const nested = path.join(staging, '.supets', project.settings.project, 'candidates', proposed.id);
  for (const file of proposed.source.files) {
    const target = path.join(staging, file.path);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(path.join(releaseDirectory(manifest.id), 'source', file.path), target);
  }
  await fs.mkdir(nested, { recursive: true });
  await writeJson(path.join(nested, 'manifest.json'), proposed);
  await fs.writeFile(path.join(nested, 'images.tar'), 'deliberately invalid Docker save archive\n', { mode: 0o600 });
  await writeJson(path.join(nested, 'archive.json'), { format: 1, manifestSha256: await hashFile(path.join(nested, 'manifest.json')), imagesSha256: await hashFile(path.join(nested, 'images.tar')) });
  const files = [...proposed.source.files.map(file => file.path), ...['manifest.json', 'images.tar', 'archive.json'].map(file => `.supets/${project.settings.project}/candidates/${proposed.id}/${file}`)];
  const archive = path.join(output, `${proposed.id}.tar`);
  await run('tar', ['--create', '--format=ustar', '--null', '--verbatim-files-from', '--no-recursion', '--files-from=-', '--file', archive], { cwd: staging, input: `${files.join('\0')}\0`, capture: true });
  await fs.writeFile(`${archive}.sha256`, `${await hashFile(archive)}  ${proposed.id}.tar\n`, { mode: 0o600 });
  try {
    await expectFailure(() => importArchive(project, proposed.id), 'genuine Docker image-load failure', /docker image load failed/);
    assert(!await exists(path.join(releaseDirectory(proposed.id), 'manifest.json')), 'Failed image load published a release');
    const prior = await fs.readFile(`${archive}.sha256`);
    await fs.writeFile(`${archive}.sha256`, `${'0'.repeat(64)}  ${proposed.id}.tar\n`);
    await expectFailure(() => importArchive(project, proposed.id), 'transferred archive checksum failure', /Transferred candidate SHA256 mismatch/);
    await fs.writeFile(`${archive}.sha256`, prior);
    // Produce a checksummed malicious path using tar itself: rejection must
    // occur during the read-only scan, before extraction or Docker image load.
    const malicious = `accept-${suffix}-traversal`;
    const unsafeArchive = path.join(output, `${malicious}.tar`);
    await fs.writeFile(path.join(staging, 'escape-marker'), 'must never be extracted outside the import directory\n');
    await run('tar', ['--create', '--format=ustar', '--absolute-names', '--transform=s|^escape-marker$|../escape-marker|', '--file', unsafeArchive, 'escape-marker'], { cwd: staging, capture: true });
    await fs.writeFile(`${unsafeArchive}.sha256`, `${await hashFile(unsafeArchive)}  ${malicious}.tar\n`);
    try {
      await expectFailure(() => importArchive(project, malicious), 'malicious archive traversal', /Unsafe archive or manifest path/);
      assert(!await exists(path.join(STATE, 'imports', 'escape-marker')), 'Malicious archive escaped import directory');
    } finally {
      await fs.rm(unsafeArchive, { force: true }); await fs.rm(`${unsafeArchive}.sha256`, { force: true });
    }
  } finally {
    await fs.rm(archive, { force: true }); await fs.rm(`${archive}.sha256`, { force: true });
    await fs.rm(staging, { recursive: true, force: true });
  }
}

async function collisionFaults(project, manifest) {
  const name = `${project.name}-occupied-${randomBytes(3).toString('hex')}`;
  const originalPort = project.settings.port;
  try {
    await docker(['run', '-d', '--name', name, '--label', 'com.supets.ephemeral=true', '-p', '127.0.0.1:0:18080', '--entrypoint', '/bin/sh', manifest.images.web.id, '-c', 'sleep 180'], { capture: true });
    const inspected = JSON.parse((await docker(['inspect', name], { capture: true })).stdout)[0];
    project.settings.port = Number(inspected.NetworkSettings.Ports['18080/tcp'][0].HostPort);
    await expectFailure(() => preflight(project, manifest), 'occupied public port', /Requested public port belongs/);
    assert(JSON.parse((await docker(['inspect', name], { capture: true })).stdout)[0].State.Running, 'Preflight stopped an unrelated port owner');
  } finally { project.settings.port = originalPort; await docker(['rm', '-f', name], { capture: true, allowFailure: true }); }
  const other = new Project({ ...project.settings, project: `collision-${randomBytes(5).toString('hex')}` });
  other.config = { ...project.config };
  const volume = `${other.name}_community-data`;
  await docker(['volume', 'create', '--label', 'com.supets.ephemeral=true', volume], { capture: true });
  try {
    await expectFailure(() => preflight(other, manifest), 'unrelated named data volume', /Named project resource already belongs/);
    await docker(['volume', 'inspect', volume], { capture: true });
  } finally { await docker(['volume', 'rm', volume], { capture: true, allowFailure: true }); }
}

export async function verifyDeployment(parent, manifest) {
  // State/config/lock and all runtime resources are separate from the caller's
  // running project. Only the already verified immutable image/source is shared.
  const suffix = randomBytes(6).toString('hex');
  const settings = { ...parent.settings, command: 'verify-deploy', project: `accept-${suffix}`, port: 0, cloud: false, ip: undefined, 'acme-email': undefined, stateDirectory: path.join(STATE, 'acceptance', suffix) };
  const project = new Project(settings);
  if (project.state !== settings.stateDirectory) throw new Error('Controller must support isolated Project.stateDirectory before deployment acceptance can run safely');
  project.exports = path.join(parent.exports, 'reports', `deployment-${suffix}`);
  const evidence = { format: 1, kind: 'isolated-deployment-fault-acceptance', invocation: suffix, at: new Date().toISOString(), release: manifest.id, fingerprint: fingerprint(manifest), passed: false, scenarios: [] };
  const fixtureDirectories = [], fixtureImages = [], fixtureBackups = [];
  const add = (name, details = {}) => evidence.scenarios.push({ name, passed: true, ...details });
  const clone = async (original, label) => {
    const result = structuredClone(original);
    result.id = `accept-${suffix}-${label}`;
    result.evidence = [];
    const directory = releaseDirectory(result.id);
    fixtureDirectories.push(directory);
    await stateDirectory(directory);
    await fs.cp(path.join(releaseDirectory(original.id), 'source'), path.join(directory, 'source'), { recursive: true });
    return result;
  };
  try {
    await project.initialize();
    await project.acquire();
    await project.loadConfig(true);
    await preflight(project, manifest);
    await project.deploy(manifest, { preflightComplete: true });
    await publicationAudit(project); add('gateway-only-ingress-and-credential-separation');
    const fixtures = await seedPreservationRows(project);
    const before = await captureDatabaseState(project);
    add('persisted-synthetic-records-and-relationships', { fixtures });
    for (const service of ['community', 'ocorrencias', 'gateway', 'community-db', 'ocorrencias-db', 'web']) add('component-outage-readiness-recovery', await outage(project, service));
    assertDatabaseState(await captureDatabaseState(project), before);
    await lockScenarios(project); add('concurrent-refusal-and-dead-owner-lock-recovery');

    const currentBytes = await fs.readFile(path.join(project.state, 'current.json'));
    const reject = async (name, altered, expected) => {
      await expectFailure(() => preflight(project, altered), name, expected);
      assert((await fs.readFile(path.join(project.state, 'current.json'))).equals(currentBytes), `${name} changed current release before refusal`);
      await project.readiness(true);
      assertDatabaseState(await captureDatabaseState(project), before);
      add(name);
    };
    const missing = structuredClone(manifest); missing.images.gateway.id = `sha256:${'0'.repeat(64)}`;
    await reject('missing-image-preflight-refusal', missing, /docker image inspect failed/);
    const architecture = structuredClone(manifest); architecture.platform = manifest.platform === 'linux/amd64' ? 'linux/arm64' : 'linux/amd64';
    await reject('wrong-architecture-preflight-refusal', architecture, /architecture/);
    const hash = structuredClone(manifest); hash.jars.gateway = '0'.repeat(64);
    await reject('jar-hash-preflight-refusal', hash, /JAR hash mismatch/);
    const source = structuredClone(manifest); source.source.files[0].sha256 = '0'.repeat(64);
    await reject('source-hash-preflight-refusal', source, /Frozen source hash mismatch/);
    const copy = structuredClone(manifest); copy.images.gateway = copy.images.postgres;
    await reject('actual-runtime-jar-copy-failure', copy, /docker cp .+ failed/);
    await importFaults(project, manifest, suffix);
    add('real-image-load-checksum-and-malicious-archive-refusal');
    await collisionFaults(project, manifest);
    add('occupied-port-and-unrelated-resource-preservation');
    const oldAddress = project.config.SITE_ADDRESS;
    project.config.SITE_ADDRESS = '';
    try { await reject('invalid-config-preflight-refusal', manifest, /docker compose .+ failed/); }
    finally { project.config.SITE_ADDRESS = oldAddress; }

    const oldAsset = await clone(manifest, 'old-asset');
    const assetPath = `assets/previous-${suffix}.js`;
    const assetBytes = Buffer.from(`export const retained = '${suffix}';\n`);
    const localAsset = path.join(project.exports, 'previous-asset.js');
    await fs.mkdir(project.exports, { recursive: true }); await fs.writeFile(localAsset, assetBytes);
    const container = (await docker(['create', '--network', 'none', manifest.images.web.id], { capture: true })).stdout.trim();
    try {
      await docker(['cp', localAsset, `${container}:/srv/${assetPath}`], { capture: true });
      const image = (await docker(['commit', container], { capture: true })).stdout.trim();
      fixtureImages.push(image); oldAsset.images.web = await project.inspectImage(image);
    } finally { await docker(['rm', container], { capture: true, allowFailure: true }); await fs.rm(localAsset, { force: true }); }
    oldAsset.assets.push({ path: assetPath, sha256: digest(assetBytes) });
    await validateImages(project, oldAsset);
    await project.deploy(oldAsset);
    let next = await clone(manifest, 'next');
    await project.deploy(next);
    const assertPreviousAsset = async () => {
      const retained = await project.request(`http://web:8080/${assetPath}`);
      assert(/javascript/.test(retained.headers.get('content-type') || '') && digest(Buffer.from(await retained.arrayBuffer())) === digest(assetBytes), 'Previous-release lazy asset bytes/MIME were not retained');
      assert((await readJson(path.join(project.state, 'previous.json'))).id === oldAsset.id, 'Unchanged activation replaced the distinct predecessor');
    };
    await assertPreviousAsset();
    add('previous-release-static-asset-bytes-and-mime');
    await project.deploy(next);
    await assertPreviousAsset();
    await project.disconnect();
    await project.compose(['down', '--timeout', '30']);
    await project.deploy(next);
    await assertPreviousAsset();
    assertDatabaseState(await captureDatabaseState(project), before);
    add('unchanged-and-restarted-release-retains-predecessor-assets');
    const predecessorId = next.id;
    next = await clone(manifest, 'following');
    await project.deploy(next);
    assert((await readJson(path.join(project.state, 'previous.json'))).id === predecessorId, 'Distinct activation did not advance the predecessor');
    await project.request(`http://web:8080/${assetPath}`, { status: 404 });
    add('distinct-release-prunes-outdated-assets');

    const failed = await clone(manifest, 'failed-activation');
    await activationFailure(project, failed);
    assert((await readJson(path.join(project.state, 'current.json'))).id === next.id, 'Failed activation changed the current release');
    await project.readiness(true, next);
    const restored = JSON.parse((await docker(['inspect', ...(await project.compose(['ps', '-q'], { capture: true })).stdout.trim().split('\n')], { capture: true })).stdout);
    for (const service of ['gateway', 'community', 'ocorrencias', 'web']) assert(restored.find(container => container.Config.Labels['com.docker.compose.service'] === service)?.Image === next.images[service].id, 'Compatible rollback did not restore the complete image set');
    assertDatabaseState(await captureDatabaseState(project), before);
    add('activation-failure-nonzero-and-complete-compatible-rollback');

    const backupMetadata = await backup(project, { exportRecovery: false });
    fixtureBackups.push(path.join(STATE, 'backups', backupMetadata.id));
    const restoredBackup = await restoreCheck(project, backupMetadata.id);
    add('consistent-two-database-backup-and-isolated-restore', { backup: backupMetadata.id, restorePassed: restoredBackup.passed });
    add('authoritative-password-and-environment-rotation', await checkPasswordRotation(project));
    assertDatabaseState(await captureDatabaseState(project), before);

    const unsupported = structuredClone(project.manifest);
    unsupported.schemas = { community: ['0'], ocorrencias: ['0'] };
    project.manifest = unsupported;
    await atomicJson(path.join(project.state, 'current.json'), unsupported);
    const incompatibleTarget = await clone(manifest, 'incompatible-predecessor');
    await activationFailure(project, incompatibleTarget);
    assert(project.config.WEB_MODE === 'maintenance', 'Schema-incompatible predecessor was incorrectly activated');
    await project.request('http://web:8080/', { status: 503 });
    assertDatabaseState(await captureDatabaseState(project), before);
    add('schema-incompatible-rollback-refusal-preserves-data');

    // First install failure is exercised with no current pointer and an actual
    // stopped backend while the independent maintenance web remains available.
    project.manifest = null;
    await fs.rm(path.join(project.state, 'current.json'), { force: true });
    await project.mode('maintenance', manifest);
    await project.compose(['stop', '-t', '30', 'community'], { manifest, capture: true });
    await project.request('http://web:8085/health');
    await project.request('http://web:8080/', { status: 503 });
    add('maintenance-web-independent-of-first-install-backend-health');
    const first = await clone(manifest, 'first-failure');
    // Keep the exact JAR bytes but inject a genuinely failing runtime entrypoint.
    // Artifact preflight passes; backend startup and dependency health must fail.
    const failedWriter = (await docker(['create', '--network', 'none', manifest.images.community.id], { capture: true })).stdout.trim();
    try {
      const image = (await docker(['commit', '--change', 'ENTRYPOINT ["/bin/sh","-c","exit 42"]', failedWriter], { capture: true })).stdout.trim();
      fixtureImages.push(image);
      first.images.community = await project.inspectImage(image);
    } finally { await docker(['rm', failedWriter], { capture: true, allowFailure: true }); }
    await expectFailure(() => project.deploy(first), 'first-install invalid writer runtime', /docker compose .+ failed|Readiness deadline exceeded/);
    assert(project.config.WEB_MODE === 'maintenance' && !await exists(path.join(project.state, 'current.json')), 'First-install failure falsely activated a current release');
    await project.request('http://web:8080/', { status: 503 });
    add('first-release-runtime-failure-remains-maintenance');
    evidence.passed = true;
    return evidence;
  } finally {
    await writeJson(path.join(parent.exports, 'reports', `deployment-${suffix}`, 'results.json'), evidence);
    // Remove only this unpredictable, labelled, disposable project; never the
    // parent project, its DB volumes, state, current or previous manifests.
    await project.disconnect().catch(() => {});
    if (project.config.JWT_SECRET) await project.compose(['down', '--volumes', '--remove-orphans', '--timeout', '30'], { manifest }).catch(() => {});
    await project.releaseLock().catch(() => {});
    for (const directory of fixtureDirectories) await fs.rm(directory, { recursive: true, force: true });
    for (const image of fixtureImages) await docker(['image', 'rm', image], { capture: true, allowFailure: true });
    for (const directory of fixtureBackups) await fs.rm(directory, { recursive: true, force: true });
    await fs.rm(settings.stateDirectory, { recursive: true, force: true });
  }
}
