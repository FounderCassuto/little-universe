'use strict';

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const bytes = base64 => Uint8Array.from(atob(base64), char => char.charCodeAt(0));
const encoder = new TextEncoder();
let content;
let privateKey;
let unlocked = false;
let worldGeneration = 0;
let sparklePreference = !matchMedia('(prefers-reduced-motion: reduce)').matches;
const assetURLs = new Map();
const pendingAssets = new Map();
let toastTimer;
let dayTimer;

const icons = {
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  crown: '<path d="m3 7 4.5 4L12 4l4.5 7L21 7l-2 12H5L3 7ZM6 22h12"/>',
  book: '<path d="M12 6c-3-3-7-3-10-2v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 2Zm0 0v15"/>',
  star: '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>',
  moon: '<path d="M21 13.2A9 9 0 0 1 10.8 3a9.2 9.2 0 1 0 10.4 10.2Z"/>',
  lock: '<rect x="5" y="10" width="14" height="12" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v3"/>',
  paw: '<ellipse cx="12" cy="16" rx="6" ry="4"/><ellipse cx="5" cy="9" rx="2" ry="3"/><ellipse cx="10" cy="5" rx="2" ry="3"/><ellipse cx="16" cy="6" rx="2" ry="3"/><ellipse cx="20" cy="11" rx="2" ry="3"/>'
};
const icon = (name, extra = '') => `<svg class="icon ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.star}</svg>`;

$('#show-key').addEventListener('click', () => {
  const field = $('#access-key');
  const showing = field.type === 'password';
  field.type = showing ? 'text' : 'password';
  $('#show-key').textContent = showing ? 'Hide' : 'Show';
  $('#show-key').setAttribute('aria-label', `${showing ? 'Hide' : 'Show'} secret key`);
  $('#show-key').setAttribute('aria-pressed', String(showing));
});

$('#unlock-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = $('#unlock-button');
  const status = $('#unlock-status');
  button.disabled = true;
  button.textContent = 'Opening your little world…';
  status.textContent = '';
  let vault;
  try {
    if (!globalThis.crypto?.subtle) throw new Error('browser');
    const response = await fetch('vault.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('network');
    vault = await response.json();
    if (vault.version !== 1 || vault.iterations !== 600000) throw new Error('format');
  } catch {
    status.textContent = globalThis.crypto?.subtle ? 'The little world couldn’t load. Please check your connection and try again.' : 'Please open this website over HTTPS or localhost in a current browser.';
    button.disabled = false;
    button.innerHTML = 'Try again <span aria-hidden="true">↗</span>';
    return;
  }
  try {
    const material = await crypto.subtle.importKey('raw', encoder.encode($('#access-key').value.trim()), 'PBKDF2', false, ['deriveKey']);
    privateKey = await crypto.subtle.deriveKey({ name:'PBKDF2', salt:bytes(vault.salt), iterations:vault.iterations, hash:'SHA-256' }, material, { name:'AES-GCM', length:256 }, false, ['decrypt']);
    const plain = await crypto.subtle.decrypt({ name:'AES-GCM', iv:bytes(vault.iv), additionalData:encoder.encode('little-world/v1') }, privateKey, bytes(vault.data));
    content = JSON.parse(new TextDecoder().decode(plain));
  } catch {
    privateKey = null;
    status.textContent = 'That key didn’t quite fit. Try the secret key we share.';
    button.disabled = false;
    button.innerHTML = 'Step inside <span aria-hidden="true">↗</span>';
    $('#access-key').focus();
    return;
  }
  $('#access-key').value = '';
  $('#access-key').type = 'password';
  unlocked = true;
  worldGeneration++;
  renderWorld();
  $('#entrance').hidden = true;
  $('#world').hidden = false;
  document.body.classList.remove('locked');
  document.title = `For ${content.nickname} · A little world`;
  $('#main').focus({ preventScroll:true });
  loadHero();
});

async function asset(id) {
  if (assetURLs.has(id)) return assetURLs.get(id);
  if (pendingAssets.has(id)) return pendingAssets.get(id);
  const generation = worldGeneration;
  const promise = (async () => {
    const item = content.assets.find(item => item.id === id);
    if (!item) throw new Error('Unknown keepsake');
    const response = await fetch(item.path);
    if (!response.ok) throw new Error('Keepsake unavailable');
    const plain = await crypto.subtle.decrypt({ name:'AES-GCM', iv:bytes(item.iv), additionalData:encoder.encode(id) }, privateKey, await response.arrayBuffer());
    if (!unlocked || worldGeneration !== generation) throw new Error('World closed');
    const url = URL.createObjectURL(new Blob([plain], { type:item.mime }));
    assetURLs.set(id, url);
    return url;
  })();
  pendingAssets.set(id, promise);
  try { return await promise; } finally { pendingAssets.delete(id); }
}

function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('visible'), 4500);
}

function renderWorld() {
  const c = content;
  const firstHello = new Date(c.started + 'T12:00:00').toLocaleDateString('en-US', {month:'long',day:'numeric',year:'numeric'});
  $('#world').innerHTML = `
    <header class="site-header wrap">
      <a href="#main" class="wordmark">${icon('moon')}<span>for my <em>${escapeHTML(c.nickname)}</em></span></a>
      <nav aria-label="Our chapters"><a href="#poem">For you</a><a href="#memories">Our memories</a><a href="#favorites">Your favorites</a><a href="#play">A little fun</a></nav>
      <button id="lock-world" class="icon-button" aria-label="Lock our little world" title="Lock our little world">${icon('lock')}</button>
    </header>
    <main id="main" tabindex="-1">
      <section class="hero wrap" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow"><span class="tiny-star">✧</span> FOR YOU. JUST BECAUSE.</p>
          <h1 id="hero-title">My favorite<br>little universe<br><em>is you.</em><span class="heading-star" aria-hidden="true">✧</span></h1>
          <p class="hero-description">${escapeHTML(c.name)}, I made you a little corner of the universe. A few memories, a few words, and a little magic, just to make you smile.</p>
          <a href="#poem" class="button primary">Start here, ${escapeHTML(c.nickname)} <span aria-hidden="true">↓</span></a>
          <div class="since"><span class="since-line"></span><p>Our first hello <span>${escapeHTML(firstHello)}</span></p><div class="days"><strong id="days-count">0</strong><span>days of you</span></div></div>
        </div>
        <div class="hero-keepsake">
          <div class="photo-orbit orbit-one" aria-hidden="true"></div><div class="photo-orbit orbit-two" aria-hidden="true"></div>
          <span class="orbit-star star-one" aria-hidden="true">✧</span><span class="orbit-star star-two" aria-hidden="true">✦</span>
          <p class="photo-corner">MY FAVORITE PLOT TWIST</p>
          <button id="hero-photo" class="hero-photo" aria-label="Open our forehead-kiss photo"><span class="image-loading">A little keepsake…</span><img id="hero-image" alt="A quiet forehead kiss together" hidden></button>
          <p class="photo-caption">somewhere between a little magic<br>and my favorite place to be.</p>
          <span class="photo-seal" aria-hidden="true">${icon('heart')}</span>
        </div>
      </section>
      <div class="chapter-divider wrap" aria-hidden="true"><span></span>✧<span></span></div>
      <section id="letters" class="letters section wrap" aria-labelledby="letters-title">
        <div class="section-intro"><p class="eyebrow">LITTLE NOTES</p><h2 id="letters-title">A little note,<br><em>just for today.</em></h2><p>Open whichever finds you today.</p></div>
        <div class="note-grid">${c.notes.map((note, i) => `<button class="note-card" data-note="${i}"><span class="note-art">${icon(note.icon)}</span><span class="eyebrow">${escapeHTML(note.label)}</span><h3>${escapeHTML(note.title)}</h3><span class="note-teaser">${escapeHTML(note.teaser)}</span><span class="note-open">Open your note <span aria-hidden="true">↗</span></span></button>`).join('')}</div>
      </section>
      <section id="poem" class="poem-section" aria-labelledby="poem-title"><div class="poem-wrap wrap"><div class="poem-aside"><span class="poem-symbol" aria-hidden="true">☾</span><p class="eyebrow">01 / FOR YOU</p><h2 id="poem-title">${escapeHTML(c.poemTitle)}</h2><p>For the heart you have,<br>and the care you deserve.</p><span class="poem-flower" aria-hidden="true">✧</span></div><div class="poem-text">${c.poem.map(stanza => `<p>${stanza.map(escapeHTML).join('<br>')}</p>`).join('')}<p class="signature">${escapeHTML(c.signature)} <span aria-hidden="true">♡</span></p></div></div><p class="poem-afterword wrap">${escapeHTML(c.poemAfterword)}</p></section>
      <section id="memories" class="memories section wrap" aria-labelledby="memories-title"><div class="section-intro"><p class="eyebrow">02 / OUR LITTLE KEEPSAKES</p><h2 id="memories-title">Ordinary moments.<br><em>My kind of magic.</em></h2><p>I tucked some of my favorite pictures away.<br>Tap a little star to unwrap one.</p></div><div class="memory-grid">${c.memories.map((memory, i) => `<button class="memory-card" data-memory="${i}" aria-label="Reveal memory ${i + 1}: ${escapeHTML(memory.title)}"><div class="memory-window"><div class="memory-cover"><span>${icon('star')}</span><p>A LITTLE MOMENT</p><small>tap to unwrap</small></div></div><div class="memory-caption"><span class="memory-number">0${i + 1}</span><h3>${escapeHTML(memory.title)}</h3><span aria-hidden="true">↗</span></div></button>`).join('')}</div><button class="video-invitation" id="open-video"><span class="play-icon" aria-hidden="true">▷</span><span>A moment that moves <small>One more little keepsake, on film.</small></span><span aria-hidden="true">↗</span></button></section>
      <section id="play" class="play-section section wrap" aria-labelledby="play-title"><div class="section-intro"><p class="eyebrow">03 / FOR THAT CLEVER MIND OF YOURS</p><h2 id="play-title">A little mischief.<br><em>A little magic.</em></h2><p>A few tiny things to play with.<br>No hurry. No score to beat.</p></div><div class="play-grid"><article class="catch-panel"><div class="play-heading">${icon('heart')}<span class="eyebrow">CATCH A COMPLIMENT</span></div><h3>This one’s a little shy.</h3><p>Try to catch it. It can only play hard to get for so long.</p><div id="catch-stage" class="catch-stage"><span class="stage-star" aria-hidden="true">✧</span><button id="catch-button" class="button soft">Catch me ♡</button></div><p id="compliment" class="compliment" aria-live="polite">A tiny chase. A sweet little reward.</p><button class="text-button" id="another-compliment" hidden>Another little compliment ↻</button></article><article class="puzzle-panel"><div class="play-heading">${icon('crown')}<span class="eyebrow">THREE LITTLE BRAIN TEASERS</span></div><div id="puzzle"></div></article></div></section>
      <section class="questions-section section wrap" aria-labelledby="questions-title"><div class="question-heading"><p class="eyebrow">ONE LITTLE QUESTION AT A TIME</p><h2 id="questions-title">I’m still getting to know<br><em>my favorite person.</em></h2><p>Pick whatever feels like you. Tell me about it later.</p></div><div class="question-card" id="question"></div></section>
      <footer class="site-footer wrap"><span aria-hidden="true">✧</span><h2>More little moments.<br><em>With you.</em></h2><p>For my ${escapeHTML(c.nickname)}. Just because.</p><p class="footer-signature">${escapeHTML(c.signature)} ♡</p><div class="footer-bottom"><span>Our little corner of the universe</span><button id="sparkle-toggle" class="text-button" aria-pressed="${sparklePreference}">Little sparkles: ${sparklePreference ? 'on' : 'off'}</button><button class="text-button" id="cuddle-assistant">${icon('paw')} A tiny cuddle assistant</button></div></footer>
    </main>`;
  updateDays();
  $('#letters').before($('#poem'));
  $('#memories .eyebrow').textContent = '02 / OUR MEMORIES';
  $('#play .section-intro .eyebrow').textContent = '04 / A LITTLE FUN';
  $('#play').insertAdjacentHTML('beforebegin', favoritesMarkup());
  setupFavorites();
  dayTimer = setInterval(updateDays, 60000);
  document.body.classList.toggle('quiet-motion', !sparklePreference);
  $('#lock-world').addEventListener('click', lockWorld);
  $$('.note-card').forEach(button => button.addEventListener('click', () => openNote(Number(button.dataset.note))));
  $$('.memory-card').forEach(button => button.addEventListener('click', () => revealMemory(button)));
  $('#hero-photo').addEventListener('click', () => openImage('m01', 'My favorite place', 'A little closer. A little happier. Together.'));
  $('#open-video').addEventListener('click', openVideo);
  $('#cuddle-assistant').addEventListener('click', () => toast(c.assistantMessage));
  $('#sparkle-toggle').addEventListener('click', () => {
    sparklePreference = !sparklePreference;
    document.body.classList.toggle('quiet-motion', !sparklePreference);
    $('#sparkle-toggle').textContent = `Little sparkles: ${sparklePreference ? 'on' : 'off'}`;
    $('#sparkle-toggle').setAttribute('aria-pressed', String(sparklePreference));
  });
  setupCatch();
  renderPuzzle();
  renderQuestion();
}

function updateDays() {
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const start = Date.parse(content.started + 'T00:00:00Z');
  $('#days-count').textContent = Math.max(0, Math.floor((today - start) / 86400000));
}

async function loadHero() {
  try {
    $('#hero-image').src = await asset('m01');
    $('#hero-image').hidden = false;
    $('#hero-photo .image-loading').hidden = true;
  } catch { $('#hero-photo .image-loading').textContent = 'Tap to try this keepsake again ♡'; }
}

function openNote(index) {
  const note = content.notes[index];
  $('#letter-body').innerHTML = `<div class="letter-icon">${icon(note.icon)}</div><p class="eyebrow">${escapeHTML(note.label)}</p><h2>${escapeHTML(note.title)}</h2>${note.body.map(line => `<p class="letter-copy">${escapeHTML(line)}</p>`).join('')}<p class="signature">${escapeHTML(content.signature)} ♡</p>`;
  if (note.artIds?.length) {
    $('#letter-body .signature').insertAdjacentHTML('beforebegin', `<div class="letter-friends">${note.artIds.map(artworkFrame).join('')}</div>`);
    loadArtworkImages($('#letter-body'));
  }
  $('#letter-dialog').showModal();
}

async function revealMemory(button) {
  if (button.disabled) return;
  const memory = content.memories[Number(button.dataset.memory)];
  if (button.classList.contains('revealed')) { openImage(memory.id, memory.title, memory.caption); return; }
  button.disabled = true;
  $('.memory-cover small', button).textContent = 'unwrapping…';
  try {
    const image = document.createElement('img');
    image.alt = memory.title;
    image.src = await asset(memory.id);
    await image.decode();
    $('.memory-window', button).prepend(image);
    button.classList.add('revealed');
    button.setAttribute('aria-label', `Enlarge memory: ${memory.title}`);
  } catch { $('.memory-cover small', button).textContent = 'couldn’t load. Tap to try again'; }
  finally { button.disabled = false; }
}

async function openImage(id, title, caption, description = title) {
  $('#memory-body').innerHTML = '<p class="loading-message">Opening a little keepsake…</p>';
  $('#memory-dialog').showModal();
  try {
    const url = await asset(id);
    if (!$('#memory-dialog').open) return;
    $('#memory-body').innerHTML = `<img class="full-memory" src="${escapeHTML(url)}" alt="${escapeHTML(description)}"><div class="full-memory-caption"><h2>${escapeHTML(title)}</h2><p>${escapeHTML(caption)}</p></div>`;
  } catch { $('#memory-body').innerHTML = '<p class="loading-message">This keepsake couldn’t load. Close it and try again.</p>'; }
}

async function openVideo() {
  $('#memory-body').innerHTML = '<p class="loading-message">Opening one more little memory…</p>';
  $('#memory-dialog').showModal();
  try {
    const [url, poster] = await Promise.all([asset('m08'), asset('m09')]);
    if (!$('#memory-dialog').open) return;
    $('#memory-body').innerHTML = `<video class="full-memory" controls playsinline preload="metadata" poster="${escapeHTML(poster)}" aria-label="Our little video memory"><source src="${escapeHTML(url)}" type="video/mp4">Your browser cannot play this video.</video><div class="full-memory-caption"><h2>A moment that moves</h2><p>A little piece of us, to play again.</p></div>`;
  } catch { $('#memory-body').innerHTML = '<p class="loading-message">This video couldn’t load. Close it and try again.</p>'; }
}

$$('dialog').forEach(dialog => {
  $('.close-button', dialog).addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => { const video = $('video', dialog); if (video) video.pause(); });
});

function setupCatch() {
  const button = $('#catch-button');
  const stage = $('#catch-stage');
  let hops = 0;
  let catches = 0;
  let caught = false;
  const compliments = content.compliments;
  button.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse' || !sparklePreference || hops >= 3 || caught || button.matches(':focus-visible')) return;
    const maxX = Math.max(0, stage.clientWidth - button.offsetWidth - 24);
    const maxY = Math.max(0, stage.clientHeight - button.offsetHeight - 24);
    const positions = [[maxX, 18], [12, maxY], [maxX * 0.65, maxY * 0.6]];
    button.style.left = `${positions[hops][0]}px`;
    button.style.top = `${positions[hops][1]}px`;
    button.classList.add('hopped');
    hops++;
    if (hops === 3) button.textContent = 'Okay, you win ♡';
  });
  const giveCompliment = () => {
    caught = true;
    $('#compliment').textContent = compliments[catches % compliments.length];
    catches++;
    $('#compliment').classList.add('won');
    $('#another-compliment').hidden = false;
    button.textContent = 'Caught with love ♡';
    celebrate(button);
  };
  button.addEventListener('click', giveCompliment);
  $('#another-compliment').addEventListener('click', giveCompliment);
}

function celebrate(element) {
  if (!sparklePreference) return;
  const box = element.getBoundingClientRect();
  for (let i = 0; i < 7; i++) {
    const star = document.createElement('span');
    star.className = 'celebration-star';
    star.textContent = i % 2 ? '♡' : '✧';
    star.setAttribute('aria-hidden', 'true');
    star.style.left = `${box.left + box.width / 2 + (i - 3) * 25}px`;
    star.style.top = `${box.top + box.height / 2}px`;
    star.style.animationDelay = `${i * 35}ms`;
    document.body.append(star);
    setTimeout(() => star.remove(), 1600);
  }
}

function artworkFrame(id) {
  const art = content.characters.find(item => item.id === id);
  if (!art) return '';
  return `<span class="art-frame"><span class="art-placeholder">A little magic is arriving…</span><img data-art="${escapeHTML(id)}" alt="${escapeHTML(art.label)}" hidden></span>`;
}

function loadArtworkImages(root) {
  $$('img[data-art]', root).forEach(async image => {
    if (image.dataset.started) return;
    image.dataset.started = 'true';
    const generation = worldGeneration;
    const placeholder = $('.art-placeholder', image.parentElement);
    try {
      const url = await asset(image.dataset.art);
      if (!image.isConnected || !unlocked || generation !== worldGeneration) return;
      image.src = url;
      await image.decode();
      if (!image.isConnected || !unlocked || generation !== worldGeneration) return;
      image.hidden = false;
      placeholder.hidden = true;
    } catch {
      if (!image.isConnected) return;
      delete image.dataset.started;
      placeholder.textContent = 'This little friend couldn’t load. Close and open this again to retry.';
    }
  });
}

function favoritesMarkup() {
  return `<section id="favorites" class="favorites-section section wrap" aria-labelledby="favorites-title"><div class="section-intro"><p class="eyebrow">03 / YOUR FAVORITES</p><h2 id="favorites-title">Your favorite worlds.<br><em>A little love in each one.</em></h2><p>Choose a world, then tap a picture for a little message.</p></div><div class="favorite-tabs" role="group" aria-label="Choose a favorite world">${content.favoriteCategories.map((category, i) => `<button type="button" class="favorite-tab" data-favorite-category="${i}" aria-pressed="${i === 0}">${escapeHTML(category.label)}<span>${category.artIds.length}</span></button>`).join('')}</div><p id="favorite-status" class="favorite-status" role="status"></p><div id="favorite-grid" class="favorite-grid"></div><details class="court-credits"><summary>Picture credits</summary><p>Character images © Disney, Pixar, and Lucasfilm. The little messages are just for you.</p><ul>${content.characters.map(friend => `<li><a href="${escapeHTML(friend.sourcePage)}" target="_blank" rel="noopener noreferrer">${escapeHTML(friend.label)}</a> · ${escapeHTML(friend.credit)}</li>`).join('')}</ul></details></section>`;
}

function setupFavorites() {
  showFavoriteCategory(0);
  $$('.favorite-tab').forEach(button => button.addEventListener('click', () => showFavoriteCategory(Number(button.dataset.favoriteCategory))));
}

function showFavoriteCategory(index) {
  const category = content.favoriteCategories[index];
  if (!category) return;
  $$('.favorite-tab').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.favoriteCategory) === index)));
  $('#favorite-status').textContent = `${category.label} · ${category.artIds.length} favorites`;
  const root = $('#favorite-grid');
  root.dataset.count = category.artIds.length;
  root.innerHTML = category.artIds.map(id => {
    const friend = content.characters.find(item => item.id === id);
    return `<button type="button" class="favorite-card" data-favorite-open="${escapeHTML(id)}" aria-label="Open ${escapeHTML(friend.label)}">${artworkFrame(id)}<span class="favorite-name"><span>${escapeHTML(friend.label)}</span><span aria-hidden="true">↗</span></span></button>`;
  }).join('');
  $$('[data-favorite-open]', root).forEach(button => button.addEventListener('click', () => {
    const friend = content.characters.find(item => item.id === button.dataset.favoriteOpen);
    openImage(friend.id, friend.label, friend.role, friend.label);
  }));
  loadArtworkImages(root);
}

function showQuestionArtwork(id) {
  const slot = $('#question-artwork-slot');
  if (!id) { slot.innerHTML = ''; return; }
  const art = content.artworks.find(item => item.id === id);
  slot.innerHTML = `<figure class="question-artwork">${artworkFrame(id)}<figcaption>${escapeHTML(art.caption)}</figcaption></figure><a href="#favorites" class="court-link">See your favorite worlds ↗</a>`;
  loadArtworkImages(slot);
  $('.court-link', slot).addEventListener('click', () => {
    const categoryIndex = content.favoriteCategories.findIndex(category => category.artIds.includes(id));
    showFavoriteCategory(Math.max(0, categoryIndex));
  });
}

const puzzles = [
  { title:'A curious little sequence', text:'2, 3, 5, 8, 12, …', prompt:'Which number comes next?', answers:['15','17','18'], correct:1, hint:'Look at the gaps between the numbers.', explanation:'17. The gaps grow by one each time: +1, +2, +3, +4, then +5.' },
  { title:'Something to think about', text:'The more you take away from me, the bigger I become.', prompt:'What am I?', answers:['A shadow','A hole','A secret'], correct:1, hint:'Imagine digging in the garden.', explanation:'A hole. Every bit you remove makes it bigger.' },
  { title:'The last little lock', text:'A bat and a ball cost $1.10 together. The bat costs $1 more than the ball.', prompt:'How much does the ball cost?', answers:['5 cents','10 cents','15 cents'], correct:0, hint:'Try your answer for the ball, then add $1 to get the bat. Do they total $1.10?', explanation:'5 cents. The bat costs $1.05, making the total $1.10.' }
];
let puzzleIndex = 0;
let puzzleSolved = false;
function renderPuzzle() {
  const root = $('#puzzle');
  if (puzzleIndex >= puzzles.length) {
    root.innerHTML = `<div class="puzzle-complete">${icon('star')}<p class="eyebrow">ALL THREE LITTLE LOCKS, OPEN</p><h3>Of course you did.</h3><p>Clever, cute, and all three little brain teasers figured out. I had a feeling you’d do that.</p><p class="puzzle-gift">Your prize: one very real forehead kiss, redeemable next time I see you. ♡</p><button id="puzzle-restart" class="text-button">Play them again ↻</button></div>`;
    $('.puzzle-gift', root).insertAdjacentHTML('afterend', `<div class="puzzle-friends">${artworkFrame('m10')}</div>`);
    loadArtworkImages(root);
    $('#puzzle-restart').addEventListener('click', () => { puzzleIndex = 0; renderPuzzle(); });
    return;
  }
  puzzleSolved = false;
  const puzzle = puzzles[puzzleIndex];
  root.innerHTML = `<div class="puzzle-progress"><span>0${puzzleIndex + 1} / 03</span><div aria-hidden="true">${puzzles.map((_, i) => `<i class="${i <= puzzleIndex ? 'filled' : ''}"></i>`).join('')}</div></div><h3>${puzzle.title}</h3><p class="puzzle-riddle">${puzzle.text}</p><p class="puzzle-prompt">${puzzle.prompt}</p><div class="puzzle-options">${puzzle.answers.map((answer, i) => `<button class="choice-button" data-answer="${i}">${answer}</button>`).join('')}</div><p id="puzzle-feedback" class="puzzle-feedback" aria-live="polite"></p><div class="puzzle-actions"><button id="puzzle-hint" class="text-button">A tiny hint?</button><button id="puzzle-skip" class="text-button">Show me this one</button><button id="puzzle-next" class="text-button" hidden>${puzzleIndex === 2 ? 'Collect your little prize' : 'The next little lock'} →</button></div>`;
  const solve = skipped => {
    puzzleSolved = true;
    $$('.choice-button', root).forEach(button => { button.disabled = true; if (Number(button.dataset.answer) === puzzle.correct) button.classList.add('correct'); });
    $('#puzzle-feedback').textContent = (skipped ? '' : 'Exactly, clever girl. ') + puzzle.explanation;
    $('#puzzle-hint').hidden = true;
    $('#puzzle-skip').hidden = true;
    $('#puzzle-next').hidden = false;
  };
  $$('.choice-button', root).forEach(button => button.addEventListener('click', () => {
    if (puzzleSolved) return;
    if (Number(button.dataset.answer) === puzzle.correct) { solve(false); celebrate(button); }
    else { $('#puzzle-feedback').textContent = 'A good thought. Take another little look. ♡'; button.classList.add('tried'); }
  }));
  $('#puzzle-hint').addEventListener('click', () => { $('#puzzle-feedback').textContent = puzzle.hint; });
  $('#puzzle-skip').addEventListener('click', () => solve(true));
  $('#puzzle-next').addEventListener('click', () => { puzzleIndex++; renderPuzzle(); });
}

let questionIndex = 0;
function renderQuestion() {
  const questions = content.questions;
  const root = $('#question');
  const question = questions[questionIndex];
  root.innerHTML = `<p class="eyebrow">0${questionIndex + 1} / 03</p><h3>${escapeHTML(question.title)}</h3><div class="question-options">${question.answers.map((answer, i) => `<button class="choice-button" data-choice="${i}" aria-pressed="false">${escapeHTML(answer)}</button>`).join('')}</div><p class="question-reply" id="question-reply" aria-live="polite"></p><button id="question-next" class="text-button">${questionIndex === questions.length - 1 ? 'Back to the first little question ↻' : 'Another little question →'}</button><p class="question-footnote">These little choices stay just for this visit.</p>`;
  $('#question-reply').insertAdjacentHTML('afterend', '<div id="question-artwork-slot"></div>');
  $$('.choice-button', root).forEach(button => button.addEventListener('click', () => {
    $$('.choice-button', root).forEach(other => { other.classList.remove('selected'); other.setAttribute('aria-pressed', 'false'); });
    button.classList.add('selected');
    button.setAttribute('aria-pressed', 'true');
    $('#question-reply').textContent = question.replies[Number(button.dataset.choice)];
    showQuestionArtwork(question.artIds?.[Number(button.dataset.choice)]);
  }));
  $('#question-next').addEventListener('click', () => { questionIndex = (questionIndex + 1) % questions.length; renderQuestion(); });
}

function lockWorld() {
  unlocked = false;
  worldGeneration++;
  for (const url of assetURLs.values()) URL.revokeObjectURL(url);
  assetURLs.clear();
  pendingAssets.clear();
  privateKey = null;
  content = null;
  clearInterval(dayTimer);
  for (const dialog of $$('dialog[open]')) dialog.close();
  $('#world').innerHTML = '';
  $('#letter-body').innerHTML = '';
  $('#memory-body').innerHTML = '';
  $('#world').hidden = true;
  $('#entrance').hidden = false;
  $('#unlock-button').disabled = false;
  $('#unlock-button').innerHTML = 'Step inside <span aria-hidden="true">↗</span>';
  document.body.classList.add('locked');
  document.title = 'A little world';
  puzzleIndex = 0;
  questionIndex = 0;
  $('#toast').classList.remove('visible');
  $('#toast').textContent = '';
  clearTimeout(toastTimer);
  $$('.celebration-star').forEach(star => star.remove());
  window.scrollTo(0, 0);
  $('#access-key').focus();
}

window.addEventListener('pageshow', event => { if (event.persisted && unlocked) lockWorld(); });
