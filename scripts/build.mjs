import { readFile, writeFile, mkdir, copyFile, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, pbkdf2Sync, createCipheriv } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const local = resolve(root, 'private');
const destination = resolve(root, 'dist');
await mkdir(resolve(destination, 'sealed'), { recursive: true });
let password;
try { password = (await readFile(resolve(local, 'access-key.txt'), 'utf8')).trim(); }
catch {
  await mkdir(local, { recursive: true });
  password = randomBytes(18).toString('base64url');
  await writeFile(resolve(local, 'access-key.txt'), password + '\n', { flag: 'wx' });
}
if (password.length < 20) {
  if (!process.argv.includes('--allow-memorable-key')) throw new Error('Use a random access key of at least 20 characters, or explicitly accept weaker protection with --allow-memorable-key.');
  if (!password.length) throw new Error('The access key cannot be empty.');
  console.warn('Warning: the chosen memorable key is easy to guess. Encryption cannot compensate for a weak key.');
}
const salt = randomBytes(32);
const iterations = 600000;
const key = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
function seal(bytes, label) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(label));
  return { iv: iv.toString('base64'), bytes: Buffer.concat([cipher.update(bytes), cipher.final(), cipher.getAuthTag()]) };
}
const content = JSON.parse(await readFile(resolve(local, 'content.json'), 'utf8'));
for (const asset of content.assets) {
  const encrypted = seal(await readFile(resolve(local, 'media', asset.source)), asset.id);
  asset.path = `sealed/${asset.id}.bin`;
  asset.iv = encrypted.iv;
  await writeFile(resolve(destination, asset.path), encrypted.bytes);
  delete asset.source;
}
const contentSeal = seal(Buffer.from(JSON.stringify(content)), 'little-world/v1');
await writeFile(resolve(destination, 'vault.json'), JSON.stringify({ version: 1, iterations, salt: salt.toString('base64'), iv: contentSeal.iv, data: contentSeal.bytes.toString('base64') }));
for (const file of await readdir(resolve(root, 'src'))) await copyFile(resolve(root, 'src', file), resolve(destination, file));
await writeFile(resolve(destination, '.nojekyll'), '');
console.log('Built encrypted website in dist/. The access key is in private/access-key.txt (never commit it).');
