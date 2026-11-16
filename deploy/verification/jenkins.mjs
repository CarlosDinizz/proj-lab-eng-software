import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { docker, atomicJson } from '../supets.mjs';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const inspect = async (kind, name) => JSON.parse((await docker([kind, 'inspect', name], { capture: true })).stdout)[0];

export async function executeCI(project) {
  // CI is optional and shares the existing project's control state, not a second secret store.
  await project.loadConfig(false);
  const network = await inspect('network', `${project.name}_jenkins`);
  if (network.Labels?.['com.supets.project'] !== project.settings.project || network.Labels?.['com.supets.managed'] !== 'true') throw new Error('Run up first: the project-owned Jenkins network is required');
  const own = await inspect('container', project.container);
  const socket = own.Mounts.find(mount => mount.Destination === '/var/run/docker.sock');
  const control = own.Mounts.find(mount => mount.Destination === '/state');
  const stateVolume = `${project.name}-state`;
  if (socket?.Type !== 'bind' || !socket.Source.startsWith('/') || control?.Type !== 'volume' || control.Name !== stateVolume) throw new Error('CI requires the launcher-selected local Docker socket and the matching named control volume');
  const socketStat = await fs.stat('/var/run/docker.sock');
  const stateStat = await fs.stat('/state');
  if (!socketStat.isSocket() || stateStat.uid !== 1000 || (stateStat.mode & 0o777) !== 0o700) throw new Error('The socket must exist and /state must be restricted to Jenkins UID 1000 (0700)');
  const listeners = (await docker(['ps', '--filter', 'publish=18080', '--format', '{{.ID}}'], { capture: true })).stdout.trim().split('\n').filter(Boolean);
  for (const id of listeners) {
    const listener = await inspect('container', id);
    const bindsPort = Object.values(listener.NetworkSettings.Ports || {}).flatMap(value => value || []).some(binding => binding.HostPort === '18080');
    if (bindsPort && (listener.Config.Labels?.['com.docker.compose.project'] !== project.name || listener.Config.Labels?.['com.docker.compose.service'] !== 'jenkins')) throw new Error('Port 18080 belongs to another container; it will not be stopped or replaced');
  }
  const engine = JSON.parse((await docker(['info', '--format', '{{json .}}'], { capture: true })).stdout);
  const architecture = { x86_64: 'amd64', amd64: 'amd64', aarch64: 'arm64', arm64: 'arm64' }[engine.Architecture];
  if (engine.OSType !== 'linux' || !architecture) throw new Error('Jenkins requires a local Linux amd64 or arm64 engine');
  const platform = `linux/${architecture}`;
  const inputs = ['deploy/Dockerfile.jenkins', 'deploy/jenkins/plugins.txt', 'deploy/jenkins/plugins.sha256', 'deploy/jenkins/init.groovy.d/10-trusted-node.groovy', 'deploy/jenkins/logging.properties', 'deploy/jenkins/candidate.mjs', 'deploy/jenkins/artifacts.mjs', 'deploy/jenkins/main.mjs', 'deploy/jenkins/approval.mjs', 'deploy/jenkins/approve-main.mjs', 'deploy/jenkins/published-main.json', 'deploy/supets.mjs', 'deploy/verification/releases.mjs'];
  const hash = createHash('sha256');
  for (const file of inputs) { hash.update(file); hash.update(await fs.readFile(path.join(root, file))); }
  const tag = `supets/${project.settings.project}-jenkins:${hash.digest('hex').slice(0, 24)}-${architecture}`;
  // The Docker CLI streams this container-local context; no host workspace bind is created.
  await docker(['buildx', 'build', '--load', '--platform', platform, '-f', 'deploy/Dockerfile.jenkins', '-t', tag, '.'], { cwd: root });
  const image = await inspect('image', tag);
  if (image.Os !== 'linux' || image.Architecture !== architecture) throw new Error('Built Jenkins image architecture mismatch');
  const env = { COMPOSE_PROJECT_NAME: project.name, SUPETS_PROJECT: project.settings.project, SUPETS_PLATFORM: project.settings.platform, JENKINS_PLATFORM: platform, JENKINS_IMAGE: image.Id, DOCKER_SOCKET_GID: String(socketStat.gid), SUPETS_STATE_VOLUME: stateVolume, SUPETS_SOCKET_PATH: socket.Source };
  const compose = (args, settings = {}) => docker(['compose', '--project-name', project.name, '--project-directory', root, '--env-file', '/dev/null', '-f', 'deploy/compose.ci.yml', ...args], { cwd: root, env, ...settings });
  await compose(['config', '--quiet'], { capture: true });
  // Persist before starting so down/status/logs can manage even an unhealthy first boot.
  await atomicJson('/state/jenkins.json', env);
  await compose(['up', '-d', '--no-deps', 'jenkins'], { timeout: 180000 });
  const container = (await compose(['ps', '-q', 'jenkins'], { capture: true })).stdout.trim();
  if (!container) throw new Error('Jenkins did not create a container');
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    const current = await inspect('container', container);
    if (!current.State.Running) throw new Error('Jenkins stopped during startup; inspect its restricted container diagnostics');
    if (current.State.Health?.Status === 'healthy') {
      const permissions = await docker(['exec', container, 'node', '--input-type=module', '-e', "import fs from 'node:fs'; if(process.getuid()!==1000) process.exit(1); fs.accessSync('/state',fs.constants.R_OK|fs.constants.W_OK);"], { capture: true, allowFailure: true, timeout: 10000 });
      if (permissions.code) throw new Error('Jenkins UID 1000 cannot read/write the shared control state');
      const access = await docker(['exec', container, 'docker', 'info', '--format', '{{.OSType}}'], { capture: true, allowFailure: true, timeout: 10000 });
      if (access.code || access.stdout.trim() !== 'linux') throw new Error('Jenkins cannot use the selected Docker socket with its supplemental GID');
      const plugins = await docker(['exec', container, 'sh', '-ec', `cd /var/jenkins_home/plugins; sha256sum --check /usr/share/jenkins/plugins.sha256; test "$(find . -maxdepth 1 -name '*.jpi' | wc -l)" -eq "$(grep -c '  ' /usr/share/jenkins/plugins.sha256)"; test -z "$(find . -maxdepth 1 -name '*.disabled' -print -quit)"; test -z "$(find . -maxdepth 1 -name '*.hpi' -print -quit)"`], { capture: true, allowFailure: true, timeout: 10000 });
      if (plugins.code) throw new Error('Jenkins home plugins differ from the reviewed image lock; do not install or upgrade plugins through the wizard');
      console.log('Jenkins HTTP and Docker access are ready at http://127.0.0.1:18080 (setup/login still required).');
      console.log('Startup does not verify jobs or enable webhooks. Use the documented candidate job or separately administrator-enabled published-main job.');
      return { kind: 'optional-jenkins-startup', image: image.Id, platform, httpReady: true, authenticatedJobVerified: false };
    }
    await pause(1000);
  }
  throw new Error('Jenkins did not become HTTP-ready within 180 seconds; no candidate verification or deployment is claimed');
}
