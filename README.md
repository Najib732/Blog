# GitBlog

A fully static blog engine powered by the **GitHub API** — no backend, no database. Posts live as JSON files in your own GitHub repo.

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | Home page — list posts, search, create new post |
| `blog.html` | Individual post reader |
| `style.css` | All styling |
| `app.js` | GitHub API integration logic |

---

## Setup (one-time)

1. **Upload all 4 files to GitHub Pages** (or any static host).
2. Go to [GitHub → Settings → Tokens](https://github.com/settings/tokens/new?scopes=repo) and create a **Personal Access Token** with the `repo` scope.
3. Open your site, click **⚙ Settings**, and fill in:
   - Your PAT
   - Your GitHub username
   - The repo name where you want posts stored
4. Hit **Save & Connect** — your token stays in `localStorage` (never sent anywhere except GitHub's API).

Posts are saved as JSON files under `posts/` in your repo.

---

## How it works

- **Create Post** → calls `PUT /repos/:owner/:repo/contents/posts/:filename` via GitHub API
- **List Posts** → calls `GET /repos/:owner/:repo/contents/posts`
- **Read Post** → fetches and base64-decodes the file content
- **Search** → client-side filter on title, body, and keywords

---

## GitHub Pages hosting

1. Create a new public repo (e.g. `my-blog`)
2. Push all 4 files to the `main` branch
3. Go to repo **Settings → Pages → Source: main branch / root**
4. Your site will be at `https://yourusername.github.io/my-blog/`
