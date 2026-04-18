# SocioNet (Mobile-first PWA)

SocioNet is a neon-styled mobile-first Progressive Web App with:
- Login/Signup
- Feed posts + stories
- Reels
- 1:1 chat + attachments
- Follow / unfollow
- Calls (Jitsi embed)
- Maps (street/satellite/terrain + traffic overlay + distance tracking)
- Install as PWA from the app header

## Deploy on Render (Fastest)

### Option A — One-click with `render.yaml` (recommended)
1. Push this repo to GitHub.
2. In Render, click **New +** → **Blueprint**.
3. Select your repo.
4. Render auto-detects `render.yaml` and creates the `socionet` static site.
5. Click **Apply** to deploy.

## Deploy on Render (Manual form values)

If you want to fill the Render form manually, use:

- **Service Type**: `Static Site`
- **Name**: `socionet`
- **Branch**: `main` (or your branch)
- **Build Command**: *(leave empty)*
- **Publish Directory**: `.`
- **Auto-Deploy**: `Yes`

Then click **Create Static Site**.

## After deploy (important for PWA)
1. Open your Render URL in mobile Chrome/Edge.
2. Login/signup and use the app.
3. Tap **Install PWA** button in app header (or browser install menu if prompt is delayed).

## Local run

Because this is static, run any static server:

```bash
python -m http.server 4173
```

Open `http://localhost:4173`.

## Notes
- Current persistence is browser localStorage (device/browser-local data).
- For production-grade multi-device sync, add a backend (DB, auth, storage, moderation, verification).
