import * as fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { approvalDirectory, approvalFile, repository, ref } from './approval.mjs';

const [operation, ...extra] = process.argv.slice(2);
if (process.getuid() !== 0 || extra.length || !['--enable', '--disable'].includes(operation) || !/^[a-z0-9][a-z0-9_-]*$/.test(process.env.SUPETS_PROJECT || '')) throw new Error('Administrator only: approve-main.mjs --enable | --disable');
await fs.mkdir(approvalDirectory, { recursive: true, mode: 0o755 });
const directory = await fs.lstat(approvalDirectory);
if (directory.isSymbolicLink() || directory.uid !== 0 || directory.mode & 0o022) throw new Error('Approval directory must remain root-owned and not writable by Jenkins');
const value = { enabled: operation === '--enable', repository, ref, project: process.env.SUPETS_PROJECT, approvedAt: new Date().toISOString() };
const temporary = `${approvalFile}.${randomUUID()}.new`;
await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o644 });
await fs.rename(temporary, approvalFile);
console.log(value.enabled ? 'Trusted published-main workflow enabled. Webhook remains disabled.' : 'Main execution disabled. Candidate mode is unchanged.');
