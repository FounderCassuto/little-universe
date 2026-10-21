# A little world, kept for two

A small purple-and-black keepsake website in four clear chapters: For you, Our memories, Your favorites, and A little fun. Includes personal photos, a poem, three notes, a catchable compliment button, three brain teasers, three gentle questions, a video, and twenty character/movie pictures. No analytics, trackers, automatic third-party requests, music, dependencies, or sign-in accounts.

## Open it locally

Install Node.js 20 or newer. In this folder run:

```
npm start
```

Open http://127.0.0.1:4173 and enter the secret key provided separately. Opening index.html directly from disk will not work; the browser needs an HTTP or HTTPS origin for loading and decryption.

## Put it on GitHub

The upload ZIP contains the repository files, including the already encrypted `dist` folder. It deliberately excludes `private`, your key, original media, and editable personal writing.

1. Extract the supplied ZIP on your computer first. Do not upload the ZIP file itself.
2. At https://github.com/new, create a repository with a neutral name such as `little-universe`. Choose a private repository if your plan supports Pages from private repositories. GitHub Free requires a public repository for Pages; read the privacy warning below before using that option. Adding an empty README at creation makes the upload button easy to find.
3. In the repository's **Code** tab, choose **Add file → Upload files**. Drag the extracted ZIP's contents into the upload area, then choose **Commit changes**. Upload the contents, not their enclosing folder. At the top level you should see `dist`, `src`, `scripts`, `.github`, `package.json`, and this README. Check that `.github/workflows/pages.yml` was included.
4. In **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source. The supplied workflow is already configured; you do not need to select a suggested template.
5. In **Actions**, select **Publish encrypted website**, then **Run workflow** and confirm **Run workflow**. Publication is manual, so uploading alone does not publish it. If the workflow is missing, check that `.github/workflows/pages.yml` was uploaded to the default branch.
6. When the run succeeds, open **Settings → Pages → Visit site**, or use the deployment URL shown in the workflow run. Test that link in a private/incognito window with the key supplied separately, then send her the link and key. She does not need a GitHub account to open an ordinary Pages site.

GitHub Pages from a private repository requires an eligible plan; GitHub Free personal accounts generally need a public repository for Pages. True private Pages access requires GitHub Enterprise Cloud organization support. A private repository by itself does **not** make an ordinary Pages site private. See [GitHub Pages availability](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) and [Pages access control](https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site).

This site instead encrypts the personal content before upload, so the public-facing files contain a generic locked entrance and encrypted data. Only someone with the secret key can decrypt the keepsakes. The existence of the website and generic interface remain public on ordinary Pages. If you require the *entire site* to be inaccessible without identity authentication, use an authenticated host connected to the private GitHub repository instead. The `dist` folder works on any static HTTPS host.

## Where your private things live

The complete local project includes `private/content.json`, `private/media/`, and `private/access-key.txt`. These are all ignored by Git and are not included in the upload ZIP. Keep a backup of this local folder; your repository will contain the encrypted build, not this editable private material. Upload the supplied ZIP or use normal Git, which respects `.gitignore`. Do not manually upload the `private` folder through GitHub's website.

The current key is a memorable nickname explicitly chosen by the owner. This is much weaker protection than the originally generated random key: public ciphertext can be downloaded and guessed against offline. Anyone who guesses the nickname can decrypt the photos and writing. For genuinely sensitive or private-only content, use a strong random passphrase or an authenticated host instead. Never upload the key or the `private` folder.

## Make it yours

Edit `private/content.json` to change the signature, poem, captions, notes, compliments, and questions. Asset IDs are stable; keep their source files in `private/media/`. Edit `src` for layout and interactions.

Then run:

```
npm run build -- --allow-memorable-key
npm run verify
```

The build requires the explicit flag above for a short, memorable key. Strong keys of at least 20 characters do not require that flag. Commit the changed `src`, `scripts`, and `dist` files. Never commit `private`. Run the publishing workflow again when you are ready. The GitHub workflow publishes the prebuilt encrypted files; it does not need the secret key or private source files.

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
- Your favorites has four categories: Star Wars, Disney, Pixar, and Disney Channel. Each favorite has one consistently sized picture card; opening it reveals its affectionate royal job title. All twenty pictures appear exactly once across the categories.
- Character pictures also appear in the royal note, matching movie-night answers, and the brain-teaser reward. Only the chosen category's pictures are displayed.
- Character pictures are existing official Disney, Pixar, Lucasfilm, and D23 promotional images. Images are bundled locally and encrypted like the personal photos. The gallery includes source credits; clicking a credit opens the publisher’s original page. The affectionate job titles and messages are original website copy.
