const STORAGE_NAMESPACE = window.location.pathname.split('/').filter(Boolean)[0] || 'root';
const STORAGE_KEY = `stilldraft::${STORAGE_NAMESPACE}::v1`;
const READING_WPM = 225;

const heroElement = document.getElementById('publishedHero');
const tocElement = document.getElementById('publishedToc');
const articleElement = document.getElementById('publishedArticle');
const printButton = document.getElementById('publishedPrintButton');

printButton.addEventListener('click', () => window.print());
tocElement.addEventListener('click', handleTocClick);

initializePublishedPage();

async function initializePublishedPage() {
  const localProject = loadProjectFromLocalStorage();
  const fileProject = await loadProjectFromFile();
  const project = localProject || fileProject;
  renderPublishedProject(project, localProject ? 'Local preview' : fileProject ? 'published-project.json' : 'No project found');
}

function loadProjectFromLocalStorage() {
  const projectId = new URLSearchParams(window.location.search).get('project');
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    const projects = Array.isArray(raw.projects) ? raw.projects : [];
    if (!projects.length) return null;
    const selected = projectId ? projects.find((project) => project.id === projectId) : null;
    return normalizeProject(selected || null);
  } catch (error) {
    console.warn('Could not read local project data:', error);
    return null;
  }
}

async function loadProjectFromFile() {
  try {
    const response = await fetch('./published-project.json', { cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json();
    return normalizeProject(data.project || data);
  } catch (error) {
    return null;
  }
}

function normalizeProject(project) {
  if (!project || typeof project !== 'object') return null;
  const chapters = Array.isArray(project.chapters)
    ? project.chapters
        .map((chapter, index) => ({
          id: String(chapter.id || `chapter-${index + 1}`),
          title: String(chapter.title || `Chapter ${index + 1}`),
          content: String(chapter.content || ''),
        }))
        .filter(Boolean)
    : [];

  if (!chapters.length) return null;

  return {
    title: String(project.title || 'Untitled Project'),
    author: String(project.author || ''),
    genre: String(project.genre || ''),
    summary: String(project.summary || ''),
    chapters,
  };
}

function renderPublishedProject(project, sourceLabel) {
  if (!project) {
    document.title = 'Stilldraft — Published';
    heroElement.innerHTML = `
      <p class="eyebrow">Nothing published yet</p>
      <h2>No public manuscript is available.</h2>
      <p>Export <code>published-project.json</code> from the writer app, place it beside this page, then redeploy to GitHub Pages.</p>
    `;
    tocElement.innerHTML = '<p class="published-empty">Add a project to generate a table of contents.</p>';
    articleElement.innerHTML = `
      <div class="published-empty">
        <p>Tip: open <strong>index.html</strong>, choose a project, then use <strong>Export publish JSON</strong>.</p>
      </div>
    `;
    return;
  }

  const words = project.chapters.reduce((sum, chapter) => sum + countWords(chapter.content), 0);
  const readTime = words ? `${Math.max(1, Math.ceil(words / READING_WPM))} min read` : '0 min read';
  document.title = `${project.title} — Stilldraft Published`;

  heroElement.innerHTML = `
    <p class="eyebrow">${escapeHtml(sourceLabel)}</p>
    <h2>${escapeHtml(project.title)}</h2>
    <p>${escapeHtml(project.summary || 'A reader-facing version of a Stilldraft manuscript.')}</p>
    <div class="published-meta">
      <span class="project-meta-chip"><span>Author</span> ${escapeHtml(project.author || 'Unnamed author')}</span>
      ${project.genre ? `<span class="project-meta-chip"><span>Genre</span> ${escapeHtml(project.genre)}</span>` : ''}
      <span class="project-meta-chip"><span>Words</span> ${formatNumber(words)}</span>
      <span class="project-meta-chip"><span>Read</span> ${readTime}</span>
    </div>
  `;

  tocElement.innerHTML = project.chapters
    .map(
      (chapter, index) => `
        <button class="toc-item" data-target="published-chapter-${index + 1}">
          <strong>${escapeHtml(chapter.title)}</strong>
          <span>Chapter ${index + 1}</span>
        </button>
      `
    )
    .join('');

  articleElement.innerHTML = `
    <div class="published-hero prose">
      <h1>${escapeHtml(project.title)}</h1>
      <p>${escapeHtml(project.summary || '')}</p>
      <p><strong>${escapeHtml(project.author || 'Unnamed author')}</strong>${project.genre ? ` · ${escapeHtml(project.genre)}` : ''}</p>
    </div>
    ${project.chapters
      .map(
        (chapter, index) => `
          <section class="reader-chapter" id="published-chapter-${index + 1}">
            <div class="reader-chapter-index">${String(index + 1).padStart(2, '0')}</div>
            <div class="reader-chapter-main prose">
              <div class="reader-chapter-heading">
                <h2>${escapeHtml(chapter.title)}</h2>
                <p>${formatNumber(countWords(chapter.content))} words</p>
              </div>
              ${renderBodyHtml(chapter.content)}
              <div class="reader-divider"></div>
            </div>
          </section>
        `
      )
      .join('')}
  `;
}

function handleTocClick(event) {
  const button = event.target.closest('[data-target]');
  if (!button) return;
  const target = document.getElementById(button.dataset.target);
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderBodyHtml(body) {
  const lines = String(body || '').split(/\n/);
  const blocks = [];
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(`<p>${escapeHtml(paragraph.join(' '))}</p>`);
    paragraph = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      return;
    }
    if (/^(\*{3,}|-{3,})$/.test(trimmed)) {
      flushParagraph();
      blocks.push('<div class="scene-break">✦ ✦ ✦</div>');
      return;
    }
    if (trimmed.startsWith('# ')) {
      flushParagraph();
      blocks.push(`<h2>${escapeHtml(trimmed.slice(2))}</h2>`);
      return;
    }
    if (trimmed.startsWith('## ')) {
      flushParagraph();
      blocks.push(`<h3>${escapeHtml(trimmed.slice(3))}</h3>`);
      return;
    }
    if (trimmed.startsWith('> ')) {
      flushParagraph();
      blocks.push(`<blockquote>${escapeHtml(trimmed.slice(2))}</blockquote>`);
      return;
    }
    paragraph.push(trimmed);
  });

  flushParagraph();
  return blocks.join('') || '<p class="published-empty">This chapter is blank.</p>';
}

function countWords(text) {
  const matches = String(text || '').match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu);
  return matches ? matches.length : 0;
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
