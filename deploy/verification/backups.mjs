import * as fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { docker, stateDirectory, writeJson } from '../supets.mjs';
import { STATE, hashFile, readJson, identifier, validateImages, validateSource } from './releases.mjs';

const databases = ['community', 'ocorrencias'];
const writers = ['gateway', 'community', 'ocorrencias'];
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const snapshotSQL = `
SET TIME ZONE 'UTC';
SET statement_timeout = '30s';
CREATE FUNCTION pg_temp.supets_snapshot() RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE t record; fk record; s record; n bigint; h text; v bigint; called boolean; joins text; present text;
 tables jsonb := '{}'::jsonb; sequences jsonb := '{}'::jsonb; relationships jsonb := '{}'::jsonb;
BEGIN
 FOR t IN SELECT c.oid, c.relname, pg_get_userbyid(c.relowner) owner FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace WHERE ns.nspname='public' AND c.relkind IN ('r','p') ORDER BY c.relname LOOP
  EXECUTE format('SELECT count(*), md5(coalesce(string_agg(md5(row_to_json(r)::text), %L ORDER BY row_to_json(r)::text), %L)) FROM public.%I r', '', '', t.relname) INTO n,h;
  tables := tables || jsonb_build_object(t.relname,jsonb_build_object('owner',t.owner,'count',n,'rowsSha',h,'primaryKey',coalesce((SELECT jsonb_agg(a.attname ORDER BY k.ordinality) FROM pg_constraint con CROSS JOIN LATERAL unnest(con.conkey) WITH ORDINALITY k(attnum,ordinality) JOIN pg_attribute a ON a.attrelid=con.conrelid AND a.attnum=k.attnum WHERE con.conrelid=t.oid AND con.contype='p'),'[]'::jsonb)));
 END LOOP;
 FOR s IN SELECT c.relname,pg_get_userbyid(c.relowner) owner FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace WHERE ns.nspname='public' AND c.relkind='S' ORDER BY c.relname LOOP
  EXECUTE format('SELECT last_value,is_called FROM public.%I',s.relname) INTO v,called;
  sequences := sequences || jsonb_build_object(s.relname,jsonb_build_object('owner',s.owner,'lastValue',v,'isCalled',called));
 END LOOP;
 FOR fk IN SELECT con.oid,con.conname,con.conrelid,con.confrelid,con.conkey,con.confkey,con.convalidated,child.relname child,parent.relname parent FROM pg_constraint con JOIN pg_class child ON child.oid=con.conrelid JOIN pg_class parent ON parent.oid=con.confrelid JOIN pg_namespace ns ON ns.oid=child.relnamespace WHERE con.contype='f' AND ns.nspname='public' ORDER BY child.relname,con.conname LOOP
  SELECT string_agg(format('c.%I=p.%I',ca.attname,pa.attname),' AND ' ORDER BY k.ordinality), string_agg(format('c.%I IS NOT NULL',ca.attname),' AND ' ORDER BY k.ordinality) INTO joins,present FROM unnest(fk.conkey,fk.confkey) WITH ORDINALITY k(ca,pa,ordinality) JOIN pg_attribute ca ON ca.attrelid=fk.conrelid AND ca.attnum=k.ca JOIN pg_attribute pa ON pa.attrelid=fk.confrelid AND pa.attnum=k.pa;
  EXECUTE format('SELECT count(*) FROM public.%I c WHERE %s AND NOT EXISTS (SELECT 1 FROM public.%I p WHERE %s)',fk.child,present,fk.parent,joins) INTO n;
  IF n <> 0 OR NOT fk.convalidated THEN RAISE EXCEPTION 'Unverified database relationship'; END IF;
  relationships := relationships || jsonb_build_object(fk.child||'.'||fk.conname,jsonb_build_object('definition',pg_get_constraintdef(fk.oid),'validated',fk.convalidated,'orphans',n));
 END LOOP;
 RETURN jsonb_build_object('database',current_database(),'databaseOwner',(SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname=current_database()),'schemaOwner',(SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='public'),'tables',tables,'sequences',sequences,'relationships',relationships);
END $$;
SELECT pg_temp.supets_snapshot();
`;
async function databaseContainer(project, service) {
  const container = (await project.compose(['ps', '-q', `${service}-db`], { capture: true })).stdout.trim();
  if (!container) throw new Error(`${service} database is not running`);
  return container;
}
export async function databaseSnapshot(project, service) {
  const result = await project.compose(['exec', '-T', `${service}-db`, 'psql', '--no-psqlrc', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', service], { capture: true, input: snapshotSQL, timeout: 120000 });
  return JSON.parse(result.stdout.trim());
}
export async function captureDatabaseState(project) {
  const snapshots = {};
  for (const service of databases) snapshots[service] = await databaseSnapshot(project, service);
  return snapshots;
}
export function assertDatabaseState(actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Database IDs/content/counts/ownership/sequences/relationships differ from the quiescent backup');
}
export async function stopWriters(project) {
  await project.mode('maintenance');
  // Stop ingress before either writer, then let both finish their transactions
  // before the first dump. Both remain stopped throughout both snapshots/dumps.
  await project.compose(['stop', '-t', '30', 'gateway'], { capture: true, timeout: 45000 });
  await project.compose(['stop', '-t', '30', 'community', 'ocorrencias'], { capture: true, timeout: 80000 });
  const ids = (await project.compose(['ps', '-aq', ...writers], { capture: true })).stdout.trim().split('\n').filter(Boolean);
  if (ids.length !== 3) throw new Error('Cannot prove all three application writers are stopped');
  for (const id of ids) {
    const inspected = JSON.parse((await docker(['inspect', id], { capture: true })).stdout)[0];
    if (inspected.State.Running || inspected.State.ExitCode === 137 || inspected.State.OOMKilled) throw new Error('Writer did not shut down gracefully; backup not created');
  }
}
async function restartWriters(project, originalMode) {
  await project.compose(['up', '-d', ...writers], { capture: true });
  await project.readiness(false);
  if (originalMode === 'normal') { await project.mode('normal'); await project.readiness(true); }
}
async function restrictedCopy(source, destination) {
  await fs.mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
  await fs.chmod(path.dirname(destination), 0o700);
  await fs.copyFile(source, destination);
  await fs.chmod(destination, 0o600);
}
export async function backup(project, { exportRecovery = true } = {}) {
  if (!project.manifest) throw new Error('No active release to back up');
  await validateSource(project.manifest);
  await validateImages(project, project.manifest);
  const id = `${new Date().toISOString().replace(/\D/g, '')}-${randomBytes(3).toString('hex')}`;
  const directory = path.join(STATE, 'backups', id);
  await stateDirectory(directory);
  const originalMode = project.config.WEB_MODE;
  let stopped = false;
  try {
    // Even a partial stop is recovered through readiness, never silently activated.
    stopped = true;
    await stopWriters(project);
    const snapshots = await captureDatabaseState(project);
    const files = {};
    for (const service of databases) {
      const container = await databaseContainer(project, service);
      const destination = path.join(directory, `${service}.dump`);
      // Stream binary output directly to restricted disk storage: docker cp
      // cannot export the database container's tmpfs, and dumps must not fill it.
      const output = await fs.open(destination, 'wx', 0o600);
      try {
        await docker(['exec', container, 'pg_dump', '-U', 'postgres', '-d', service, '--format=custom', '--lock-wait-timeout=5000'], { capture: true, stdoutFd: output.fd, timeout: 180000 });
      } finally { await output.close(); }
      if (process.getuid() === 0) await fs.chown(destination, 1000, 1000);
      files[`${service}.dump`] = await hashFile(destination);
    }
    assertDatabaseState(await captureDatabaseState(project), snapshots);
    const metadata = { format: 1, id, createdAt: new Date().toISOString(), release: project.manifest.id, platform: project.manifest.platform, postgresImage: project.manifest.images.postgres, files, snapshots };
    await writeJson(path.join(directory, 'metadata.json'), metadata);
    // Recovery credentials are deliberately outside candidates and source. This
    // explicit backup command is the only automatic restricted recovery export.
    const recovery = path.join(directory, 'recovery.env');
    await restrictedCopy(path.join(project.state || STATE, 'runtime.env'), recovery);
    if (process.getuid() === 0) await fs.chown(recovery, 1000, 1000);
    if (exportRecovery) {
      const output = path.join(project.exports, 'backups', id);
      for (const file of ['community.dump', 'ocorrencias.dump', 'metadata.json', 'recovery.env']) await restrictedCopy(path.join(directory, file), path.join(output, file));
      console.log(`Restricted backup ${id}: ${path.relative(project.exports, output)}; copy dumps AND recovery.env off-instance using SSH/SCP. Never commit or include in candidates.`);
    }
    return metadata;
  } finally {
    if (stopped) {
      try { await restartWriters(project, originalMode); }
      catch (error) { await project.mode('maintenance').catch(() => {}); throw new Error(`Backup recovery did not reach readiness; maintenance retained: ${error.message}`); }
    }
  }
}
async function restoreSnapshot(container, service) {
  const result = await docker(['exec', '-i', container, 'psql', '--no-psqlrc', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', service], { capture: true, input: snapshotSQL, timeout: 120000 });
  return JSON.parse(result.stdout.trim());
}
export async function restoreCheck(project, id) {
  if (!identifier(id)) throw new Error('Invalid backup identifier');
  const directory = path.join(STATE, 'backups', id);
  const metadata = await readJson(path.join(directory, 'metadata.json'));
  if (metadata.format !== 1 || metadata.id !== id || metadata.platform !== project.settings.platform || !/^sha256:[a-f0-9]{64}$/.test(metadata.postgresImage?.id)) throw new Error('Invalid backup metadata or architecture');
  await project.inspectImage(metadata.postgresImage.id);
  const names = [], actual = {};
  try {
    for (const service of databases) {
      if (!/^[a-f0-9]{64}$/.test(metadata.files?.[`${service}.dump`]) || await hashFile(path.join(directory, `${service}.dump`)) !== metadata.files[`${service}.dump`]) throw new Error('Backup dump checksum mismatch');
      const name = `${project.name}-restore-${service}-${randomBytes(5).toString('hex')}`;
      const password = randomBytes(32).toString('hex');
      names.push(name);
      // No runtime networks, state or publications. Anonymous data/dump volumes
      // belong only to this container and are removed with it, not limited by RAM.
      await docker(['create', '--name', name, '--label', 'com.supets.ephemeral=true', '--label', `com.supets.project=${project.settings.project}`, '--network', 'none', '--platform', metadata.platform, '--memory', '512m', '--read-only', '--cap-drop', 'ALL', '--cap-add', 'CHOWN', '--cap-add', 'DAC_OVERRIDE', '--cap-add', 'FOWNER', '--cap-add', 'SETGID', '--cap-add', 'SETUID', '--security-opt', 'no-new-privileges', '--volume', '/var/lib/postgresql/data', '--volume', '/restore', '--tmpfs', '/tmp:rw,nosuid,size=32m', '--tmpfs', '/var/run/postgresql:rw,nosuid,size=16m', '-e', `POSTGRES_PASSWORD=${password}`, '-e', 'POSTGRES_USER=postgres', '-e', `POSTGRES_DB=${service}`, '-e', `APP_DB=${service}`, '-e', `APP_USER=${service}_app`, '-e', `APP_PASSWORD=${randomBytes(32).toString('hex')}`, '-e', 'TEST_DATABASE=false', metadata.postgresImage.id], { capture: true });
      await docker(['start', name], { capture: true });
      const deadline = Date.now() + 120000;
      let ready = false;
      while (Date.now() < deadline) {
        const result = await docker(['exec', '-e', `PGPASSWORD=${password}`, '-e', 'PGCONNECT_TIMEOUT=2', name, 'psql', '--no-psqlrc', '-h', '127.0.0.1', '-U', 'postgres', '-d', service, '-Atc', 'SELECT 1'], { capture: true, allowFailure: true, timeout: 5000 });
        if (!result.code && result.stdout.trim() === '1') { ready = true; break; }
        await pause(500);
      }
      if (!ready) throw new Error('Isolated restore PostgreSQL did not initialize');
      await docker(['cp', path.join(directory, `${service}.dump`), `${name}:/restore/restore.dump`], { capture: true });
      await docker(['exec', name, 'pg_restore', '-U', 'postgres', '-d', service, '--clean', '--if-exists', '--exit-on-error', '--no-tablespaces', '/restore/restore.dump'], { capture: true, timeout: 180000 });
      actual[service] = await restoreSnapshot(name, service);
      const ownership = actual[service];
      if (ownership.databaseOwner !== `${service}_app` || ownership.schemaOwner !== `${service}_app` || Object.values(ownership.tables).some(table => table.owner !== `${service}_app`) || Object.values(ownership.sequences).some(sequence => sequence.owner !== `${service}_app`)) throw new Error('Restored database/schema/table/sequence ownership is not the application role');
    }
    assertDatabaseState(actual, metadata.snapshots);
    const evidence = { kind: 'isolated-two-database-restore', passed: true, at: new Date().toISOString(), backup: id, release: metadata.release, snapshots: actual };
    await writeJson(path.join(directory, 'restore-check', `${randomUUID()}.json`), evidence);
    console.log(`Restore verified: ${id} (IDs/content/counts/ownership/relationships preserved; production untouched)`);
    return evidence;
  } finally {
    for (const name of names) await docker(['rm', '-f', '-v', name], { capture: true, allowFailure: true });
  }
}
export async function checkPasswordRotation(project) {
  const service = 'community';
  const key = 'COMMUNITY_DB_PASSWORD';
  const oldPassword = project.config[key], next = randomBytes(32).toString('hex');
  const before = await captureDatabaseState(project);
  const originalMode = project.config.WEB_MODE;
  let changed = false;
  await stopWriters(project);
  const change = async value => {
    // psql substitution quotes the value as a SQL literal, never a shell fragment.
    await project.compose(['exec', '-T', `${service}-db`, 'psql', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', service, '-v', `new_password=${value}`], { capture: true, input: `ALTER ROLE community_app PASSWORD :'new_password';\n` });
    project.config[key] = value;
    await project.saveConfig();
  };
  try {
    changed = true;
    await change(next);
    await project.compose(['up', '-d', '--no-deps', '--force-recreate', service], { capture: true });
    const container = await databaseContainer(project, service);
    const login = await docker(['exec', '-e', `PGPASSWORD=${next}`, '-e', 'PGCONNECT_TIMEOUT=2', container, 'psql', '--no-psqlrc', '-h', '127.0.0.1', '-U', 'community_app', '-d', service, '-Atc', 'SELECT 1'], { capture: true, timeout: 5000 });
    if (login.stdout.trim() !== '1') throw new Error('Rotated application password does not authenticate over TCP');
    await restartWriters(project, originalMode);
    assertDatabaseState(await captureDatabaseState(project), before);
    return { kind: 'authoritative-role-and-environment-password-rotation', passed: true };
  } catch (error) {
    await project.mode('maintenance').catch(() => {});
    await project.compose(['stop', '-t', '30', ...writers], { capture: true }).catch(() => {});
    if (changed) {
      await change(oldPassword);
      await project.compose(['up', '-d', '--no-deps', '--force-recreate', service], { capture: true });
      await restartWriters(project, originalMode);
    }
    throw error;
  }
}
