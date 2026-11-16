import { mkdir, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ufs = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
const source = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados';
const snapshot = {};
for (const uf of ufs) {
  const response = await fetch(`${source}/${uf}/municipios?orderBy=nome`, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`IBGE ${uf}: HTTP ${response.status}; snapshot unchanged`);
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length === 0) throw new Error(`Empty municipality list: ${uf}`);
  const names = rows.map(row => row.nome?.trim().normalize('NFC'));
  if (names.some(name => !name) || new Set(names).size !== names.length) throw new Error(`Invalid municipality list: ${uf}`);
  snapshot[uf] = names.sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
const content = `${JSON.stringify(snapshot, null, 2)}\n`;
const metadata = {
  source: 'IBGE — API de Localidades',
  urls: ufs.map(uf => `${source}/${uf}/municipios?orderBy=nome`),
  retrievedAt: new Date().toISOString(),
  sha256: createHash('sha256').update(content).digest('hex'),
  states: ufs.length,
  municipalities: Object.values(snapshot).reduce((sum, names) => sum + names.length, 0),
  attribution: 'Instituto Brasileiro de Geografia e Estatística (IBGE). Snapshot local; sem consulta externa durante cadastro ou inicialização.'
};
const directory = fileURLToPath(new URL('../../shared/data/', import.meta.url));
await mkdir(directory, { recursive: true });
await writeFile(path.join(directory, 'municipios.json.new'), content);
await writeFile(path.join(directory, 'municipios.metadata.json.new'), `${JSON.stringify(metadata, null, 2)}\n`);
await rename(path.join(directory, 'municipios.metadata.json.new'), path.join(directory, 'municipios.metadata.json'));
await rename(path.join(directory, 'municipios.json.new'), path.join(directory, 'municipios.json'));
console.log(`Saved ${metadata.municipalities} municipalities across ${metadata.states} UFs; SHA256 ${metadata.sha256}`);
