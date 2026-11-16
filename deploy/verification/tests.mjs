import * as fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import { docker, writeJson } from '../supets.mjs';

export async function runTests(project, manifest) {
  const suffix = randomBytes(5).toString('hex');
  const testProject = `${project.name}-test-${suffix}`;
  const password = randomBytes(32).toString('hex');
  const env = { COMPOSE_PROJECT_NAME: testProject, SUPETS_PROJECT: project.settings.project, SUPETS_PLATFORM: manifest.platform, POSTGRES_IMAGE: manifest.images.postgres.id, TEST_DB_PASSWORD: password };
  const compose = args => docker(['compose', '--project-name', testProject, '--env-file', '/dev/null', '-f', 'deploy/compose.test.yml', ...args], { env, cwd: path.join('/state/releases', manifest.id, 'source') });
  const reportDirectory = path.join(project.exports, 'reports', `${manifest.id}-${suffix}`);
  await fs.mkdir(reportDirectory, { recursive: true });
  const results = [];
  const failures = [];
  try {
    await compose(['up', '-d', '--wait', '--wait-timeout', '120']);
    for (const service of ['gateway', 'community', 'ocorrencias', 'web']) {
      const image = manifest.buildImages[service];
      if (!image) throw new Error(`Candidate lacks frozen ${service} test image`);
      await project.inspectImage(image.id);
      const database = `${service}_test`;
      const args = ['create', '--name', `${testProject}-${service}`, '--label', 'com.supets.managed=true', '--label', `com.supets.project=${project.settings.project}`, '--network', `${testProject}_test`, '--platform', manifest.platform, '--memory', '1024m', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--entrypoint', '/bin/sh'];
      if (service !== 'web') {
        args.push('-e', 'JAVA_TOOL_OPTIONS=-Xmx512m', '-e', 'JWT_SECRET=isolated-test-only-signing-key-never-deploy-2026');
        if (service !== 'gateway') args.push('-e', `SUPETS_TEST_DB_URL=jdbc:postgresql://${service}-test-db:5432/${database}`, '-e', `SUPETS_TEST_DB_USER=${database}`, '-e', `SUPETS_TEST_DB_PASSWORD=${password}`, '-e', `SUPETS_TEST_DATABASE=${database}`);
      }
      const workingDirectory = service === 'web' ? '/workspace/frontend/supets' : `/workspace/microsservicos/${service}`;
      args.push('-w', workingDirectory, image.id, '-ec', service === 'web' ? 'exec npm test' : 'exec ./mvnw -B -o surefire:test');
      const container = (await docker(args, { capture: true })).stdout.trim();
      const destination = path.join(reportDirectory, service);
      await fs.mkdir(destination, { recursive: true });
      let exitCode;
      try {
        const started = await docker(['start', '-a', container], { allowFailure: true, timeout: 600000 });
        const inspected = JSON.parse((await docker(['inspect', container], { capture: true })).stdout)[0];
        exitCode = inspected.State.Running ? 124 : inspected.State.ExitCode;
        if (inspected.State.Running) await docker(['stop', '--time', '5', container], { capture: true });
        const logs = await docker(['logs', container], { capture: true, allowFailure: true });
        await fs.writeFile(path.join(destination, service === 'web' ? 'tests.tap' : 'tests.log'), logs.stdout + logs.stderr);
        if (service !== 'web') {
          const copied = await docker(['cp', `${container}:${workingDirectory}/target/surefire-reports/.`, destination], { capture: true, allowFailure: true });
          if (copied.code && !exitCode) throw new Error(`Successful ${service} test process produced no JUnit reports`);
        }
        if (started.code && !exitCode) exitCode = started.code;
        results.push({ service, image: image.id, exitCode, oomKilled: inspected.State.OOMKilled });
        if (exitCode) throw new Error(`${service} tests failed (exit ${exitCode}${inspected.State.OOMKilled ? ', OOM' : ''}); reports: ${destination}`);
        if (service !== 'web') {
          const jarName = service === 'gateway' ? 'supets' : service;
          const temporaryJar = path.join(destination, 'tested.jar');
          await docker(['cp', `${container}:${workingDirectory}/target/${jarName}-0.0.1-SNAPSHOT.jar`, temporaryJar]);
          const digest = createHash('sha256').update(await fs.readFile(temporaryJar)).digest('hex');
          await fs.unlink(temporaryJar);
          if (digest !== manifest.jars[service]) throw new Error(`${service} tested JAR differs from runtime JAR`);
        }
      } catch (error) {
        failures.push({ service, message: error.message });
      } finally { await docker(['rm', '-f', container], { capture: true, allowFailure: true }); }
    }
    if (failures.length) throw new Error(`${failures.map(failure => failure.message).join('; ')}`);
    return { kind: 'frozen-image-unit-and-postgresql-tests', passed: true, at: new Date().toISOString(), results, reportDirectory: path.relative(project.exports, reportDirectory) };
  } finally {
    await writeJson(path.join(reportDirectory, 'results.json'), { at: new Date().toISOString(), release: manifest.id, results, failures });
    await compose(['down', '--timeout', '10']);
  }
}
