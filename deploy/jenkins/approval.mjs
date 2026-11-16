import * as fs from 'node:fs/promises';

export const approvalDirectory = '/etc/supets-ci';
export const approvalFile = `${approvalDirectory}/published-main.json`;
export const repository = 'https://github.com/CarlosDinizz/proj-lab-eng-software';
export const ref = 'refs/heads/main';

export async function publishedMainApproval() {
  for (const file of [approvalDirectory, approvalFile]) {
    const stat = await fs.lstat(file);
    if (stat.isSymbolicLink() || stat.uid !== 0 || stat.mode & 0o022 || file === approvalFile && !stat.isFile() || file === approvalDirectory && !stat.isDirectory()) throw new Error('Published-main approval must be root-owned and not writable by Jenkins or its group');
  }
  const approval = JSON.parse(await fs.readFile(approvalFile, 'utf8'));
  if (approval.enabled !== true || approval.repository !== repository || approval.ref !== ref || approval.project !== process.env.SUPETS_PROJECT) throw new Error('Main execution remains disabled until an administrator enables the reviewed published main workflow');
  return approval;
}
