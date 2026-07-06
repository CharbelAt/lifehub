# Turn LifeHub into an app on your phone (free, ~5 minutes)

Your app is now a PWA (installable web app). It needs to be put online **once** —
after that it installs like a normal app and works **fully offline**.
Your data never goes online; it stays on your phone.

## Step 1 — Put the 5 files online (free, one time)

1. On any device, go to **github.com** and create a free account.
2. Click **+** (top right) → **New repository**. Name it `lifehub`, keep it **Public**, click **Create repository**.
3. Click **uploading an existing file** and upload these 5 files from this folder:
   - `LifeHub.html`
   - `manifest.webmanifest`
   - `sw.js`
   - `icon.svg`
   - `icon-maskable.svg`
4. Click **Commit changes**.
5. In the repo: **Settings → Pages** → under "Branch" pick **main** and **/ (root)** → **Save**.
6. Wait ~1 minute. Your app is now at:
   `https://YOUR-USERNAME.github.io/lifehub/LifeHub.html`

Note: "Public" means someone could see the app's code if they had the link —
but never your data. Your numbers, tasks and logs live only inside your phone.

## Step 2 — Install it on your A56

1. Open that link in **Chrome** on your phone.
2. Tap the **⋮** menu → **"Add to Home screen" → "Install"** (may say "Install app").
3. Done. LifeHub now has its own icon in your app drawer, opens fullscreen
   with no browser bar, and works with no internet at all.

## Step 3 — Move your existing data (if you used the old file)

1. Open the OLD LifeHub file → **⋯ → Back up my data** (downloads a .json file).
2. Open the new installed app → **⋯ → Restore from backup** → pick that file.

## Updating the app later

When I improve the app, re-upload the new `LifeHub.html` to the repo
(GitHub → open the file → pencil icon → or just upload again) and bump the
version in `sw.js` (change `lifehub-v1` to `lifehub-v2`). The installed app
picks it up next time it's opened with internet.

## Want a real .apk file too? (optional)

Once Step 1 is done, go to **pwabuilder.com**, paste your app link,
and it generates an Android **.apk** you can install directly. Free.
The Chrome install above gives the same experience, so this is optional.
