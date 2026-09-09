# Publishing this mockup to GitHub Pages

Hand this file to your coding agent along with the `streetpulse-mockup/`
folder. It's a static site (no build step) — the goal is just to get
`index.html` and its `css/`, `js/`, `assets/` folders hosted at a public
URL so it can be opened on a phone via Safari and added to the home
screen.

## Prerequisites

- `git` installed and configured (`git config user.name` / `user.email` set)
- GitHub CLI (`gh`) installed and authenticated — check with `gh auth status`;
  if not authenticated, run `gh auth login` first and stop to let the human
  complete the browser sign-in step before continuing
- Run all commands from inside the `streetpulse-mockup/` folder

## Steps

### 1. Turn the folder into a git repo and push it

If this folder isn't a git repo yet and there's no GitHub repo for it:

```bash
cd streetpulse-mockup
git init -b main
git add .
git commit -m "Add StreetPulse visual mockup"
gh repo create streetpulse-mockup --public --source=. --remote=origin --push
```

If a GitHub repo already exists for this project, skip `gh repo create` and
instead:

```bash
git remote add origin <existing-repo-url>
git push -u origin main
```

### 2. Enable GitHub Pages

```bash
gh api -X POST repos/{owner}/{repo}/pages \
  -f "source[branch]=main" -f "source[path]=/"
```

`{owner}` and `{repo}` are literal — `gh api` resolves them automatically
from the current repo when run inside it. If that call fails because Pages
is already enabled, that's fine, move on to step 3.

Equivalent manual path, if the API call is blocked for any reason: on
github.com, go to the repo → **Settings → Pages → Source: Deploy from a
branch → Branch: `main`, folder `/ (root)` → Save**.

### 3. Get the live URL and confirm it's up

```bash
gh api repos/{owner}/{repo}/pages --jq .html_url
```

This prints something like `https://<username>.github.io/streetpulse-mockup/`.
The first deploy can take a minute or two. Confirm it's live:

```bash
curl -sI "$(gh api repos/{owner}/{repo}/pages --jq .html_url)" | head -1
```

Expect `HTTP/2 200` (a `404` right after enabling Pages usually just means
the first build hasn't finished yet — wait ~60s and retry).

### 4. Report back

Give the human the URL from step 3. That's the link to open in Safari on
an iPhone → **Share → Add to Home Screen** — no App Store, no Apple
Developer account needed.

## One thing to flag to the human, not just do silently

GitHub Pages' free tier requires the repo to be **public**, so this
mockup becomes visible to anyone with the link once Pages is enabled. The
data in `js/data.js` (Heat Relief Network site list) is already public
info, so that's not a new exposure — but if the visual design itself is
something the human would rather not have publicly discoverable, don't
enable Pages without confirming that's acceptable; an unlisted repo name
is the only real privacy lever on the free tier (Pages has no link-only
/ password-protected mode).
