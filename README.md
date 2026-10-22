# A little world, kept for two

A small purple-and-black keepsake website in four clear chapters: For you, Our memories, Your favorites, and A little fun. Includes personal photos, a poem, three notes, a catchable compliment button, three brain teasers, three gentle questions, a video, and twenty character/movie pictures. No analytics, trackers, automatic third-party requests, music, dependencies, or sign-in accounts.

## Open it locally

Install Node.js 20 or newer. In this folder run:

```
npm start
```

Open http://127.0.0.1:4173 and enter the secret key provided separately. Opening index.html directly from disk will not work; the browser needs an HTTP or HTTPS origin for loading and decryption.

## Put it on GitHub

The current upload package is `HoneyBunny-Full-Site.zip`, next to this project folder. It contains the complete encrypted website with `index.html` at the top level. It deliberately excludes this editable project, the key, original media, and private writing. There is no outer `dist` folder in this ZIP and no custom workflow is required.

1. Extract `HoneyBunny-Full-Site.zip` on your computer. Do not upload the ZIP file itself.
2. Use your existing empty repository, or create one at https://github.com/new with a neutral name such as `little-universe`. Adding an empty README at creation makes the upload button easy to find. GitHub Free requires a public repository for Pages; private-repository Pages requires an eligible paid plan. Read the privacy warning below.
3. In the repository's **Code** tab, choose **Add file → Upload files**, or **uploading an existing file** on an empty-repository setup screen. Upload everything inside the extracted package, not its enclosing folder, then commit the upload to the default branch, normally `main`. You should see `index.html`, `app.js`, `vault.json`, the CSS files, and `sealed` directly in the repository. Do not upload the local `honeybunny` project folder.
4. In **Settings → Pages → Build and deployment**, set **Source** to **Deploy from a branch**. Select **main** (or the branch containing the uploaded files) and **/(root)**, then click **Save**. This replaces the earlier custom-workflow setup. Do not configure the old Static HTML workflow pointing at `dist` for this root-level package.
5. Allow time for GitHub to publish, then refresh **Settings → Pages** and click **Visit site**. GitHub says publication can take up to 10 minutes. Test the live URL in a private/incognito window with the separately supplied key, then send her the URL and key. She does not need a GitHub account to open an ordinary Pages site.

GitHub Pages from a private repository requires an eligible plan; GitHub Free personal accounts generally need a public repository for Pages. True private Pages access requires GitHub Enterprise Cloud organization support. A private repository by itself does **not** make an ordinary Pages site private. See [GitHub Pages availability](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) and [Pages access control](https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site).

This site instead encrypts the personal content before upload, so the public-facing files contain a generic locked entrance and encrypted data. Only someone with the secret key can decrypt the keepsakes. The existence of the website and generic interface remain public on ordinary Pages. If you require the *entire site* to be inaccessible without identity authentication, use an authenticated host connected to the private GitHub repository instead. The `dist` folder works on any static HTTPS host.

## Where your private things live

The complete local project includes `private/content.json`, `private/media/`, and `private/access-key.txt`. These are all ignored by Git and are not included in the upload ZIP. Keep this local folder; the website repository contains only the encrypted build, not the editable private material. Upload only the contents of the supplied full-site ZIP. Never upload the whole local project through GitHub's website.

The working folder was tidied on October 21, 2026. Previous ZIPs, previews, and asset-preparation helpers are recoverable under `work/archive/cleanup-2026-10-21` in the workspace. That folder also contains `PRIVATE-project-backup.zip`, a complete pre-cleanup backup including private originals and the key. It is local recovery material, not an upload package.

The current key is a memorable nickname explicitly chosen by the owner. This is much weaker protection than the originally generated random key: public ciphertext can be downloaded and guessed against offline. Anyone who guesses the nickname can decrypt the photos and writing. For genuinely sensitive or private-only content, use a strong random passphrase or an authenticated host instead. Never upload the key or the `private` folder.

## Make it yours

Edit `private/content.json` to change the signature, poem, captions, notes, compliments, and questions. Asset IDs are stable; keep their source files in `private/media/`. Edit `src` for layout and interactions.

Then run:

```
npm run build -- --allow-memorable-key
npm run verify
```

The build requires the explicit flag above for a short, memorable key. Strong keys of at least 20 characters do not require that flag. After rebuilding, upload all the contents of `dist` directly into the website repository's root. Upload the full set together because each build creates new encrypted media and metadata. With branch publishing enabled, committing those files publishes the update. Never upload `private`, the key, or the local backup.

To rotate the key, replace `private/access-key.txt` with a new cryptographically random key of at least 20 characters and rebuild. Previously downloaded website versions remain decryptable with their old key; key rotation cannot revoke copies someone already saved.

## How privacy works

The build derives a 256-bit key using PBKDF2-SHA256 with a random 32-byte salt and 600,000 iterations. The personal JSON and each media file are encrypted independently with AES-256-GCM, unique 12-byte IVs, and authenticated asset labels. The browser decrypts only after the key is entered. Photos and video use temporary in-memory blob URLs. The key and question answers are never stored in browser storage or sent to a service. The host receives ordinary requests for the encrypted files.

Click the lock in the header to clear the displayed content and revoke in-memory media URLs. Reloading also locks the site. Normal browser extensions, a compromised device, or someone who already knows the key can still see or save unlocked content. Shared-key encryption is not individual-account authorization.

## Interaction details

- Mouse hover makes the compliment button hop three times, then stop. Touch and keyboard users can click it immediately.
- All puzzles offer hints and answer reveals; nothing important is locked behind solving them.
- The day counter uses the visitor's local calendar day from September 24, 2026.
- Photo reveals, notes, video playback, and questions are all optional. Video never autoplays.
- System reduced-motion preferences are respected. The footer also offers a sparkle/motion toggle.
- The questions react during the visit only; this version does not collect or send answers to either partner.
- The four chapter links remain visible on phones. The poem and notes come first, followed by personal memories, favorite worlds, and games/questions.
- Your favorites has four categories: Star Wars, Disney, Pixar, and Disney Channel. Each favorite has one consistently sized picture card; opening it reveals its little message. All twenty pictures appear exactly once across the categories.
- Character pictures also appear in the smile-crew note, matching movie-night answers, and the brain-teaser reward. Only the chosen category's pictures are displayed.
- Character pictures are existing official Disney, Pixar, Lucasfilm, and D23 promotional images. Images are bundled locally and encrypted like the personal photos. The gallery includes source credits; clicking a credit opens the publisher’s original page. The affectionate job titles and messages are original website copy.
