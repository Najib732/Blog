/* ═══════════════════════════════════════════════════════════
   GitHub Blog Engine — app.js
   ═══════════════════════════════════════════════════════════ */

const GH = {
  BASE: 'https://api.github.com',

  get token() { return localStorage.getItem('gh_token') || ''; },
  get owner() { return localStorage.getItem('gh_owner') || ''; },
  get repo()  { return localStorage.getItem('gh_repo')  || ''; },
  get folder(){ return 'posts'; },

  isConfigured() {
    return this.token && this.owner && this.repo;
  },

  headers() {
    return {
      'Authorization': `token ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
  },

  /* ── List all posts ── */
  async listPosts() {
    const url = `${this.BASE}/repos/${this.owner}/${this.repo}/contents/${this.folder}`;
    const res = await fetch(url, { headers: this.headers() });
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`GitHub error: ${res.status}`);
    const files = await res.json();
    return files.filter(f => f.name.endsWith('.json'));
  },

  /* ── Read one post ── */
  async getPost(filename) {
    const url = `${this.BASE}/repos/${this.owner}/${this.repo}/contents/${this.folder}/${filename}`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) throw new Error(`Could not fetch post: ${res.status}`);
    const data = await res.json();
    const content = JSON.parse(atob(data.content.replace(/\n/g, '')));
    return { ...content, sha: data.sha, filename };
  },

  /* ── Create post ── */
  async createPost(post) {
    const slug = slugify(post.title);
    const ts   = Date.now();
    const filename = `${ts}-${slug}.json`;
    const payload  = JSON.stringify({ ...post, created: new Date().toISOString(), slug }, null, 2);
    const encoded  = btoa(unescape(encodeURIComponent(payload)));

    const url = `${this.BASE}/repos/${this.owner}/${this.repo}/contents/${this.folder}/${filename}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify({ message: `Add post: ${post.title}`, content: encoded })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || `GitHub error: ${res.status}`);
    }
    return filename;
  },
};

/* ── Utilities ── */
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

let toastTimer;
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ''; }, 3500);
}

/* ════════════════════════════════════════════
   INDEX PAGE
════════════════════════════════════════════ */
if (document.getElementById('blog-list')) {
  let allPosts = [];

  /* ── Setup banner ── */
  const banner = document.getElementById('setup-banner');
  const inToken = document.getElementById('in-token');
  const inOwner = document.getElementById('in-owner');
  const inRepo  = document.getElementById('in-repo');
  const btnSave = document.getElementById('btn-save-config');

  function checkConfig() {
    if (!GH.isConfigured()) {
      banner.style.display = 'block';
    } else {
      banner.style.display = 'none';
      loadPosts();
    }
  }

  btnSave && btnSave.addEventListener('click', () => {
    const t = inToken.value.trim();
    const o = inOwner.value.trim();
    const r = inRepo.value.trim();
    if (!t || !o || !r) { toast('Fill in all three fields', 'error'); return; }
    localStorage.setItem('gh_token', t);
    localStorage.setItem('gh_owner', o);
    localStorage.setItem('gh_repo', r);
    checkConfig();
    toast('Configuration saved ✓');
  });

  /* ── Load posts ── */
  async function loadPosts() {
    const list = document.getElementById('blog-list');
    list.innerHTML = `<div class="empty-state"><span>⏳</span>Loading posts…</div>`;
    try {
      const files = await GH.listPosts();
      if (files.length === 0) {
        list.innerHTML = `<div class="empty-state"><span>✍️</span>No posts yet — write your first one!</div>`;
        return;
      }

      /* Fetch metadata for all posts in parallel */
      const posts = await Promise.all(files.map(f => GH.getPost(f.name)));
      posts.sort((a, b) => new Date(b.created) - new Date(a.created));
      allPosts = posts;
      renderList(posts);
    } catch (e) {
      list.innerHTML = `<div class="empty-state"><span>⚠️</span>${e.message}</div>`;
    }
  }

  function renderList(posts) {
    const list = document.getElementById('blog-list');
    if (posts.length === 0) {
      list.innerHTML = `<div class="empty-state"><span>🔍</span>No posts match your search.</div>`;
      return;
    }
    list.innerHTML = posts.map(p => `
      <a class="blog-item" href="blog.html?file=${encodeURIComponent(p.filename)}">
        <span class="blog-item-dot"></span>
        <span class="blog-item-title">${escHtml(p.title)}</span>
        <span class="blog-item-tags">
          ${(p.keywords || []).slice(0, 2).map(k => `<span class="tag">${escHtml(k)}</span>`).join('')}
        </span>
        <span class="blog-item-meta">${formatDate(p.created)}</span>
      </a>
    `).join('');
  }

  /* ── Search ── */
  const searchInput = document.getElementById('search-input');
  const searchInfo  = document.getElementById('search-results-info');

  searchInput && searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
      renderList(allPosts);
      searchInfo.textContent = '';
      return;
    }
    const filtered = allPosts.filter(p => {
      const inTitle   = p.title.toLowerCase().includes(q);
      const inBody    = p.body.toLowerCase().includes(q);
      const inKeys    = (p.keywords || []).some(k => k.toLowerCase().includes(q));
      return inTitle || inBody || inKeys;
    });
    renderList(filtered);
    searchInfo.textContent = `${filtered.length} post${filtered.length !== 1 ? 's' : ''} found for "${searchInput.value.trim()}"`;
  });

  /* ── Create post modal ── */
  const modal   = document.getElementById('create-modal');
  const btnOpen = document.getElementById('btn-create');
  const btnClose= document.getElementById('btn-close-modal');
  const btnCancel= document.getElementById('btn-cancel');
  const form    = document.getElementById('create-form');
  const btnSubmit= document.getElementById('btn-submit');
  const keywordsInput = document.getElementById('in-keywords');

  function openModal() {
    if (!GH.isConfigured()) { toast('Configure GitHub credentials first', 'error'); return; }
    modal.classList.add('open');
    document.getElementById('in-title').focus();
  }

  function closeModal() {
    modal.classList.remove('open');
    form && form.reset();
  }

  btnOpen   && btnOpen.addEventListener('click', openModal);
  btnClose  && btnClose.addEventListener('click', closeModal);
  btnCancel && btnCancel.addEventListener('click', closeModal);
  modal     && modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  /* Tag preview for keywords */
  const keyPreview = document.getElementById('keyword-preview');
  keywordsInput && keywordsInput.addEventListener('input', () => {
    const kws = keywordsInput.value.split(',').map(k => k.trim()).filter(Boolean);
    keyPreview.innerHTML = kws.map(k => `<span class="tag">${escHtml(k)}</span>`).join(' ');
  });

  /* Submit */
  btnSubmit && btnSubmit.addEventListener('click', async () => {
    const title   = document.getElementById('in-title').value.trim();
    const body    = document.getElementById('in-body').value.trim();
    const keywords= (keywordsInput.value || '').split(',').map(k => k.trim()).filter(Boolean);

    if (!title) { toast('Title is required', 'error'); return; }
    if (!body)  { toast('Content cannot be empty', 'error'); return; }

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span class="spinner"></span> Publishing…`;

    try {
      await GH.createPost({ title, body, keywords });
      toast(`"${title}" published ✓`);
      closeModal();
      await loadPosts();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = 'Publish Post';
    }
  });

  /* ── Settings icon reopen ── */
  document.getElementById('btn-settings') && document.getElementById('btn-settings').addEventListener('click', () => {
    banner.style.display = banner.style.display === 'none' ? 'block' : 'none';
    if (banner.style.display === 'block') {
      inToken.value = GH.token;
      inOwner.value = GH.owner;
      inRepo.value  = GH.repo;
    }
  });

  /* ── Boot ── */
  if (GH.isConfigured()) {
    inToken && (inToken.value = GH.token);
    inOwner && (inOwner.value = GH.owner);
    inRepo  && (inRepo.value  = GH.repo);
  }
  checkConfig();
}

/* ════════════════════════════════════════════
   BLOG PAGE
════════════════════════════════════════════ */
if (document.getElementById('blog-content')) {
  const params   = new URLSearchParams(location.search);
  const filename = params.get('file');

  const titleEl    = document.getElementById('blog-title');
  const dateEl     = document.getElementById('blog-date');
  const tagsEl     = document.getElementById('blog-tags');
  const bodyEl     = document.getElementById('blog-content');

  async function loadBlog() {
    if (!filename) { bodyEl.textContent = 'No post specified.'; return; }
    if (!GH.isConfigured()) {
      bodyEl.innerHTML = `<p style="color:var(--text-muted)">Please <a href="index.html" style="color:var(--accent)">configure GitHub credentials</a> first.</p>`;
      return;
    }
    bodyEl.textContent = 'Loading…';
    try {
      const post = await GH.getPost(filename);
      document.title = post.title + ' — GitBlog';
      titleEl.textContent = post.title;
      dateEl.textContent  = formatDate(post.created);
      tagsEl.innerHTML    = (post.keywords || []).map(k => `<span class="tag">${escHtml(k)}</span>`).join('');
      bodyEl.textContent  = post.body;
    } catch (e) {
      bodyEl.textContent = `Error: ${e.message}`;
    }
  }

  loadBlog();
}

/* ── XSS helper ── */
function escHtml(str = '') {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
