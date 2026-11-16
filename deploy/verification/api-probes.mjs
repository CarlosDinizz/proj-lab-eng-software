import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { Project, writeJson } from '../supets.mjs';

// Synthetic test documents validate arithmetic only; they do not identify real people.
function cpf() {
  let value = String(randomBytes(4).readUInt32BE() % 1000000000).padStart(9, '0');
  for (const size of [10, 11]) {
    const remainder = [...value].reduce((sum, digit, index) => sum + Number(digit) * (size - index), 0) % 11;
    value += remainder < 2 ? '0' : String(11 - remainder);
  }
  return value;
}
function cnpj() {
  let value = String(randomBytes(6).readUIntBE(0, 6) % 1000000000000).padStart(12, '0');
  for (const weights of [[5,4,3,2,9,8,7,6,5,4,3,2], [6,5,4,3,2,9,8,7,6,5,4,3,2]]) {
    const remainder = [...value].reduce((sum, digit, index) => sum + Number(digit) * weights[index], 0) % 11;
    value += remainder < 2 ? '0' : String(11 - remainder);
  }
  return value;
}
const password = 'Demonstracao123!';
const dateInBrasilia = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = name => parts.find(item => item.type === name).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
};

export async function runRuntimeProbes(parent, manifest) {
  const suffix = randomBytes(5).toString('hex');
  const project = new Project({ ...parent.settings, project: `${parent.settings.project}-api-${suffix}`, port: 0, cloud: false, ip: undefined, 'acme-email': undefined, stateDirectory: path.join(parent.state, 'acceptance', `api-${suffix}`) });
  const evidence = { kind: 'isolated-runtime-api', release: manifest.id, at: new Date().toISOString(), passed: false, checks: [] };
  const report = path.join(parent.exports, 'reports', `${manifest.id}-api-${suffix}.json`);
  const base = 'http://web:8080';
  const check = (name, condition) => { assert.ok(condition, name); evidence.checks.push(name); };
  async function request(route, { method = 'GET', body, token, expected = 200, headers = {}, raw } = {}) {
    const response = await fetch(`${base}${route}`, {
      method, headers: { ...(body !== undefined || raw !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body: raw ?? (body === undefined ? undefined : JSON.stringify(body)), signal: AbortSignal.timeout(15000), redirect: 'manual'
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    if (expected !== null) assert.equal(response.status, expected, `${method} ${route}: expected ${expected}, got ${response.status}`);
    return { status: response.status, data, headers: response.headers };
  }
  const sql = async (service, query) => (await project.compose(['exec', '-T', `${service}-db`, 'psql', '--no-psqlrc', '-U', 'postgres', '-d', service, '-At', '-v', 'ON_ERROR_STOP=1', '-c', query], { capture: true })).stdout.trim();
  const signupBody = (role, label, overrides = {}) => ({ nome: `TESTE ${label} ${suffix}`, [role === 'cidadao' ? 'cpf' : 'cnpj']: role === 'cidadao' ? cpf() : cnpj(), cep: '01001000', endereco: 'Praça da Sé, 1 — dados fictícios', municipio: 'São Paulo', estado: 'SP', email: `${label}-${suffix}@example.invalid`, senha: password, ...overrides });
  async function account(role, label, overrides) {
    const body = signupBody(role, label, overrides);
    const registered = await request(`/community/${role}/api/v1`, { method: 'POST', body, expected: 201 });
    const logged = await request('/community/auth/api/v1/login', { method: 'POST', body: { email: body.email.trim(), senha: body.senha } });
    assert.equal(logged.data.id, registered.data.id);
    assert.equal(logged.data.perfil, role === 'cidadao' ? 'CIDADAO' : 'ONG');
    return { ...logged.data, body };
  }
  try {
    await project.initialize();
    await project.loadConfig(true);
    project.manifest = manifest;
    project.config.WEB_MODE = 'normal';
    await project.compose(['up', '-d', '--wait', '--wait-timeout', '180']);
    await project.readiness(true, manifest);
    check('Caddy HTML/assets and aggregate readiness from exact candidate', true);
    const citizen = await account('cidadao', 'citizen', { municipio: ' sa\u0303o paulo ', estado: 'sp' });
    const helper = await account('cidadao', 'helper');
    const ong = await account('ong', 'ong');
    const otherOng = await account('ong', 'alpha-ong', { cnpj: '12.ABC.345/01DE-35' });
    check('Both profiles register/login; numeric/alphanumeric CNPJ; canonical address', await sql('community', `SELECT municipio || '|' || estado FROM cidadao WHERE id='${citizen.id}'`) === 'São Paulo|SP');
    for (const [role, actor] of [['cidadao', citizen], ['ong', ong]]) {
      const profile = await request(`/community/${role}/api/v1/${actor.id}`, { token: role === 'cidadao' ? citizen.token : undefined });
      assert.deepEqual(Object.keys(profile.data).sort(), ['id', 'nome', 'perfil']);
      assert.equal(profile.data.id, actor.id);
      await request(`/community/${role}/api/v1/${randomUUID()}`, { token: citizen.token, expected: 404 });
      await request(`/community/${role}/api/v1/123`, { token: citizen.token, expected: 400 });
    }
    await request(`/community/cidadao/api/v1/${citizen.id}`, { expected: 401 });
    check('Safe UUID account GETs, malformed400, absent404 and citizen authentication', true);
    for (const [role, changes, field] of [
      ['cidadao', { cpf: '11111111111' }, 'cpf'], ['cidadao', { cpf: `${citizen.body.cpf.slice(0, 10)}${(Number(citizen.body.cpf[10]) + 1) % 10}` }, 'cpf'],
      ['ong', { cnpj: '00000000000000' }, 'cnpj'], ['ong', { cnpj: '12.ABC.345/01DE-34' }, 'cnpj'],
      ['cidadao', { estado: 'ZZ' }, 'estado'], ['ong', { estado: 'RJ', municipio: 'São Paulo' }, 'municipio']
    ]) {
      const rejected = await request(`/community/${role}/api/v1`, { method: 'POST', body: signupBody(role, randomBytes(3).toString('hex'), changes), expected: 400 });
      assert.equal(typeof rejected.data[field], 'string');
    }
    await request('/community/cidadao/api/v1', { method: 'POST', body: { ...citizen.body, email: ` ${citizen.body.email.toUpperCase()} ` }, expected: 409 });
    await request('/community/ong/api/v1', { method: 'POST', body: signupBody('ong', 'duplicate-doc', { cnpj: '12abc34501de35' }), expected: 409 });
    check('Invalid/repeated/checksum documents and invalid UF-city rejected; canonical duplicates409', true);
    const raceEmail = `race-${suffix}@example.invalid`;
    const race = await Promise.all([
      request('/community/cidadao/api/v1', { method: 'POST', body: signupBody('cidadao', 'race-c', { email: ` ${raceEmail.toUpperCase()} ` }), expected: null }),
      request('/community/ong/api/v1', { method: 'POST', body: signupBody('ong', 'race-o', { email: raceEmail }), expected: null })
    ]);
    assert.deepEqual(race.map(result => result.status).sort(), [201, 409]);
    const winner = await request('/community/auth/api/v1/login', { method: 'POST', body: { email: raceEmail, senha: password } });
    assert.equal(winner.data.id, race.find(result => result.status === 201).data.id);
    check('Cross-profile concurrent signup yields one201/one409 and working winner', await sql('community', `SELECT count(*) FROM (SELECT id FROM cidadao WHERE lower(btrim(email))='${raceEmail}' UNION ALL SELECT id FROM ong WHERE lower(btrim(email))='${raceEmail}') identities`) === '1');
    const ambiguousEmail = `ambiguous-${suffix}@example.invalid`;
    await sql('community', `UPDATE cidadao SET email='${ambiguousEmail}' WHERE id='${helper.id}'; UPDATE ong SET email='${ambiguousEmail}' WHERE id='${otherOng.id}';`);
    const ambiguous = await request('/community/auth/api/v1/login', { method: 'POST', body: { email: ambiguousEmail, senha: password }, expected: 401 });
    const absent = await request('/community/auth/api/v1/login', { method: 'POST', body: { email: `absent-${suffix}@example.invalid`, senha: password }, expected: 401 });
    assert.deepEqual(ambiguous.data, absent.data);
    check('Explicit legacy collision fixture fails closed with generic401 and no deletion', await sql('community', `SELECT count(*) FROM (SELECT id FROM cidadao WHERE email='${ambiguousEmail}' UNION ALL SELECT id FROM ong WHERE email='${ambiguousEmail}') identities`) === '2');
    await sql('community', `UPDATE cidadao SET email='${helper.body.email}' WHERE id='${helper.id}'; UPDATE ong SET email='${otherOng.body.email}' WHERE id='${otherOng.id}';`);
    const occurrenceBase = '/ocorrencia/api/v1';
    const references = {};
    for (const route of ['tipos', 'especies', 'portes', 'sexos']) references[route] = (await request(`${occurrenceBase}/${route}`, { token: citizen.token })).data;
    assert.ok(references.tipos.some(type => type.tipo === 'Desaparecimento'));
    const payload = { titulo: `TESTE ocorrência ${suffix}`, descricao: 'Descrição fictícia para aceitação integrada.', dataOcorrido: '2026-01-01', tipoOcorrenciaId: references.tipos[0].id, cep: '01001000', endereco: 'Praça da Sé, 1', cidade: 'São Paulo', estado: 'SP', lat: -23.5505, lon: -46.6333, animal: { nome: 'Animal fictício', especieId: references.especies[0].id, sexoId: references.sexos[0].id, porteId: references.portes[0].id, raca: 'Sem raça definida' } };
    await request(occurrenceBase, { method: 'POST', token: ong.token, body: payload, expected: 403 });
    check('ONG occurrence create403 with zero occurrence/animal writes', await sql('ocorrencias', 'SELECT (SELECT count(*) FROM ocorrencia) || \'|\' || (SELECT count(*) FROM animal)') === '0|0');
    const created = (await request(occurrenceBase, { method: 'POST', token: citizen.token, body: payload, headers: { 'X-Usuario-Id': helper.id, 'X-Usuario-Perfil': 'ONG' }, expected: 201 })).data;
    assert.equal(created.cidadaoId, citizen.id);
    const animalId = await sql('ocorrencias', `SELECT animal_id FROM ocorrencia WHERE id='${created.id}'`);
    const editedPayload = { ...payload, titulo: `TESTE edição ${suffix}`, descricao: 'Descrição alterada.', dataOcorrido: '2026-01-02', tipoOcorrenciaId: references.tipos.at(-1).id, cep: '13010000', endereco: 'Praça em Campinas, 2', cidade: 'Campinas', lat: -22.9056, lon: -47.0608, animal: { especieId: references.especies.at(-1).id, nome: '', raca: null, sexoId: null, porteId: null } };
    const edited = (await request(`${occurrenceBase}/${created.id}`, { method: 'PUT', token: citizen.token, body: editedPayload })).data;
    for (const field of ['titulo','descricao','dataOcorrido','tipoOcorrenciaId','cep','endereco','cidade','estado','lat','lon']) assert.equal(edited[field], editedPayload[field]);
    for (const field of ['id','cidadaoId','status','responsavelId','responsavelPerfil','createdAt']) assert.equal(edited[field], created[field]);
    for (const field of ['nome','raca','sexoId','porteId']) assert.equal(edited.animal[field], null);
    assert.equal(await sql('ocorrencias', `SELECT animal_id FROM ocorrencia WHERE id='${created.id}'`), animalId);
    await request(`${occurrenceBase}/${created.id}`, { method: 'PUT', token: helper.token, body: payload, expected: 403 });
    await request(`${occurrenceBase}/${created.id}`, { method: 'PUT', token: ong.token, body: payload, expected: 403 });
    await request(`${occurrenceBase}/${created.id}`, { method: 'PUT', token: citizen.token, body: { ...payload, animal: { ...payload.animal, especieId: 2147483647 } }, expected: 400 });
    assert.deepEqual((await request(`${occurrenceBase}/${created.id}`, { token: citizen.token })).data, edited);
    check('Full author-open edit persists every field, clears optionals, preserves IDs/metadata; foreign and invalid lookup rollback', true);
    const claims = await Promise.all([helper, ong].map(actor => request(`${occurrenceBase}/${created.id}/status`, { method: 'PATCH', token: actor.token, body: { status: 'EM_ANDAMENTO' }, expected: null })));
    assert.deepEqual(claims.map(result => result.status).sort(), [200, 409]);
    await request(`${occurrenceBase}/${created.id}`, { method: 'PUT', token: citizen.token, body: payload, expected: 409 });
    const responsible = claims[0].status === 200 ? helper : ong;
    const resolved = (await request(`${occurrenceBase}/${created.id}/status`, { method: 'PATCH', token: responsible.token, body: { status: 'RESOLVIDA' } })).data;
    assert.equal(resolved.status, 'RESOLVIDA');
    assert.equal(resolved.responsavelId, responsible.id);
    check('Concurrent claims produce one winner; claimed edit409 and responsible resolve persist', await sql('ocorrencias', `SELECT status FROM ocorrencia WHERE id='${created.id}'`) === 'RESOLVIDA');
    const near = (await request(occurrenceBase, { method: 'POST', token: citizen.token, body: { ...payload, titulo: 'TESTE fronteira 9.996km', lat: -23.4606 }, expected: 201 })).data;
    const nearby = (await request(`${occurrenceBase}?lat=-23.5505&lon=-46.6333&raioKm=10`, { token: citizen.token })).data;
    assert.ok(nearby.some(item => item.id === near.id));
    for (const query of ['raioKm=10', 'lat=0', 'lon=0', 'lat=NaN&lon=0', 'lat=0&lon=Infinity', 'lat=91&lon=0', 'lat=0&lon=181', 'lat=0&lon=0&raioKm=0', 'lat=0&lon=0&raioKm=501', 'lat=0&lon=0&raioKm=NaN']) await request(`${occurrenceBase}?${query}`, { token: citizen.token, expected: 400 });
    const across = (await request(occurrenceBase, { method: 'POST', token: citizen.token, body: { ...payload, titulo: 'TESTE antimeridiano', lat: 0, lon: -179.99 }, expected: 201 })).data;
    assert.ok((await request(`${occurrenceBase}?lat=0&lon=179.99&raioKm=10`, { token: citizen.token })).data.some(item => item.id === across.id));
    check('Real PostgreSQL includes 9.996km boundary and antimeridian; invalid geographic queries400', true);
    const campaignBase = '/community/campanha/api/v1';
    const types = (await request(`${campaignBase}/tipos`, { token: ong.token })).data;
    const today = dateInBrasilia();
    const campaignBody = { titulo: `TESTE campanha ${suffix}`, descricao: 'Campanha fictícia de aceitação.', dataInicio: today, dataFim: today, tipoCampanhaId: types[0].id, cep: '01001000', endereco: 'Praça da Sé, 3', cidade: 'São Paulo', estado: 'SP' };
    await request(campaignBase, { method: 'POST', token: citizen.token, body: campaignBody, expected: 403 });
    const campaign = (await request(campaignBase, { method: 'POST', token: ong.token, body: campaignBody, expected: 201 })).data;
    const updated = (await request(`${campaignBase}/${campaign.id}`, { method: 'PUT', token: ong.token, body: { ...campaignBody, titulo: `TESTE campanha editada ${suffix}` } })).data;
    await request(`${campaignBase}/${campaign.id}`, { method: 'PUT', token: otherOng.token, body: campaignBody, expected: 403 });
    assert.equal((await request(`${campaignBase}/${campaign.id}`, { token: ong.token })).data.titulo, updated.titulo);
    const joins = await Promise.all([0,1].map(() => request(`${campaignBase}/${campaign.id}/participacoes`, { method: 'POST', token: citizen.token, expected: null })));
    assert.deepEqual(joins.map(result => result.status).sort(), [201, 409]);
    const joined = (await request(`${campaignBase}/${campaign.id}`, { token: citizen.token })).data;
    assert.equal(joined.participando, true); assert.equal(joined.totalParticipantes, 1);
    check('Campaign ownership/edit and concurrent membership are persisted truthfully', await sql('community', `SELECT count(*) FROM participacao_campanha WHERE campanha_id='${campaign.id}'`) === '1');
    // Explicit controlled boundary fixture; never presented as a user-created historical campaign.
    await sql('community', `UPDATE campanha SET data_inicio=DATE '2020-01-01',data_fim=DATE '2020-01-02' WHERE id='${campaign.id}'`);
    const ended = await request(`${campaignBase}/${campaign.id}/participacoes`, { method: 'POST', token: helper.token, expected: 409 });
    assert.match(ended.data.message, /terminou/);
    const notJoined = (await request(`${campaignBase}/${campaign.id}`, { token: helper.token })).data;
    check('Ended campaign409 never creates membership', notJoined.participando === false && notJoined.totalParticipantes === 1);
    await request('/community/internal/ready', { token: citizen.token, expected: 404 });
    await request('/internal/ready', { token: citizen.token, expected: 404 });
    await request('/github-webhook/', { method: 'POST', body: {}, expected: 404 });
    await request('/community/auth/api/v1/login', { method: 'POST', raw: JSON.stringify({ email: 'x'.repeat(70000), senha: password }), expected: 413 });
    check('Private readiness/webhook hidden and oversized request rejected413', true);
    const firstHtml = await request('/ocorrencias/qualquer-rota');
    assert.match(firstHtml.headers.get('content-type'), /text\/html/);
    assert.equal(firstHtml.headers.get('cache-control'), 'no-store');
    assert.equal(firstHtml.headers.get('x-content-type-options'), 'nosniff');
    check('SPA deep refresh and browser security/cache headers', true);
    let limited;
    const burstDeadline = Date.now() + 45000;
    for (let attempt = 1; attempt <= 242 && Date.now() < burstDeadline; attempt++) {
      const response = await request('/community/auth/api/v1/login', { method: 'POST', body: {}, headers: { 'X-SuPets-Client-IP': `198.51.100.${attempt}` }, expected: null });
      assert.ok([400, 429].includes(response.status), 'Burst request must validate or be throttled');
      if (response.status === 429) { limited = response; break; }
    }
    assert.ok(limited, 'Authentication burst must be throttled despite forged per-request client IPs');
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
    check('Login rate limit429/Retry-After cannot be bypassed by forged client-IP header', true);
    evidence.passed = true;
    return evidence;
  } finally {
    await writeJson(report, evidence);
    await project.disconnect();
    await project.compose(['down', '--volumes', '--timeout', '10']).catch(error => { console.error(`Owned API test cleanup failed: ${error.message}`); });
    if (evidence.passed) await fs.rm(project.state, { recursive: true });
  }
}
