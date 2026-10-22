import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pbkdf2Sync, createDecipheriv } from 'node:crypto';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const password = (await readFile(resolve(root, 'private/access-key.txt'), 'utf8')).trim();
const vault = JSON.parse(await readFile(resolve(dist, 'vault.json'), 'utf8'));
const key = pbkdf2Sync(password, Buffer.from(vault.salt, 'base64'), vault.iterations, 32, 'sha256');
function open(data, iv, label, suppliedKey = key) {
  const decipher = createDecipheriv('aes-256-gcm', suppliedKey, Buffer.from(iv, 'base64'));
  decipher.setAAD(Buffer.from(label));
  decipher.setAuthTag(data.subarray(-16));
  return Buffer.concat([decipher.update(data.subarray(0, -16)), decipher.final()]);
}
const sealedContent = Buffer.from(vault.data, 'base64');
const content = JSON.parse(open(sealedContent, vault.iv, 'little-world/v1'));
assert(content.nickname && content.notes.length === 3 && content.questions.length === 3);
const personalCopy = JSON.stringify(content);
assert(!/sith\s+queen|royal|highness|\bqueen\b/i.test(personalCopy), 'Avoid unwanted titles in personal copy');
assert(!/\u2013|\u2014|--/.test(personalCopy), 'Avoid dash-style punctuation in personal copy');
const clientSource = await readFile(resolve(dist, 'app.js'), 'utf8');
assert(!/sith\s+queen|royal|highness|\bqueen\b/i.test(clientSource), 'Avoid unwanted titles in the interface');
assert(!/\u2013|\u2014|--/.test(clientSource), 'Avoid dash-style punctuation in the interface');
const assetIds = new Set(content.assets.map(item => item.id));
assert.equal(assetIds.size, content.assets.length, 'Asset IDs must be unique');
for (const reference of [...content.notes.flatMap(note => note.artIds || []), ...content.questions.flatMap(question => question.artIds || []), ...content.courtGroups.flatMap(group => group.artIds), ...content.artworks.flatMap(album => album.members)]) assert(assetIds.has(reference), 'Missing referenced artwork');
assert.equal(content.artworks.length, 6);
assert.equal(content.characters.length, 20);
assert.equal(content.favoriteCategories.length, 4);
const favoriteIds = content.favoriteCategories.flatMap(category => category.artIds);
assert.equal(favoriteIds.length, 20, 'Each favorite must appear once');
assert.deepEqual(new Set(favoriteIds), new Set(content.characters.map(friend => friend.id)), 'All twenty pictures must be in a favorite category');
assert.deepEqual(new Set(content.artworks.flatMap(album => album.members)), new Set(content.characters.map(friend => friend.id)), 'Every character picture must be in a gallery album');
const wrongKey = pbkdf2Sync('deliberately-wrong-access-key', Buffer.from(vault.salt, 'base64'), vault.iterations, 32, 'sha256');
assert.throws(() => open(sealedContent, vault.iv, 'little-world/v1', wrongKey));
for (const item of content.assets) {
  const cipher = await readFile(resolve(dist, item.path));
  const plain = open(cipher, item.iv, item.id);
  assert(plain.length > 1000);
  if (item.mime === 'image/jpeg') assert(plain[0] === 0xff && plain[1] === 0xd8);
  if (item.mime === 'video/mp4') assert(plain.subarray(4, 8).toString() === 'ftyp');
  if (item.mime === 'image/webp') assert(plain.subarray(0, 4).toString() === 'RIFF' && plain.subarray(8, 12).toString() === 'WEBP');
  const changed = Buffer.from(cipher); changed[5] ^= 1;
  assert.throws(() => open(changed, item.iv, item.id));
}
for (const filename of await readdir(dist)) {
  if (filename === 'sealed') continue;
  const raw = await readFile(resolve(dist, filename), 'utf8');
  for (const secret of [content.name, content.nickname, 'Ophelia', password, ...content.poem.flat()]) assert(!raw.toLowerCase().includes(secret.toLowerCase()), `Private content leaked to ${filename}`);
}
assert(!('source' in content.assets[0]));
console.log(`Verified: all ${content.assets.length} media files decrypt, artwork references resolve, wrong keys and modified ciphertext fail, personal names/poem/key are absent from public files.`);
