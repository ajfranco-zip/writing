const APP_NAME = 'Stilldraft';
const APP_VERSION = 1;
const READING_WPM = 225;
const STORAGE_NAMESPACE = window.location.pathname.split('/').filter(Boolean)[0] || 'root';
const STORAGE_KEY = `stilldraft::${STORAGE_NAMESPACE}::v${APP_VERSION}`;
const VALID_STATUSES = ['draft', 'editing', 'ready'];

const elements = {
  appFrame: document.getElementById('appFrame'),
  sidebar: document.getElementById('sidebar'),
  viewEyebrow: document.getElementById('viewEyebrow'),
  viewTitle: document.getElementById('viewTitle'),
  saveStatus: document.getElementById('saveStatus'),
  focusModeButton: document.getElementById('focusModeButton'),
  mobileSidebarToggle: document.getElementById('mobileSidebarToggle'),
  dashboardView: document.getElementById('dashboardView'),
  editorView: document.getElementById('editorView'),
  readerView: document.getElementById('readerView'),
  totalProjectsStat: document.getElementById('totalProjectsStat'),
  totalChaptersStat: document.getElementById('totalChaptersStat'),
  totalWordsStat: document.getElementById('totalWordsStat'),
  projectSearchInput: document.getElementById('projectSearchInput'),
  statusFilterSelect: document.getElementById('statusFilterSelect'),
  projectGrid: document.getElementById('projectGrid'),
  emptyDashboardTemplate: document.getElementById('emptyDashboardTemplate'),
  continueWritingNav: document.getElementById('continueWritingNav'),
  readerNavButton: document.getElementById('readerNavButton'),
  newProjectButton: document.getElementById('newProjectButton'),
  dashboardNewProjectButton: document.getElementById('dashboardNewProjectButton'),
  loadSampleButton: document.getElementById('loadSampleButton'),
  exportBackupButton: document.getElementById('exportBackupButton'),
  restoreBackupInput: document.getElementById('restoreBackupInput'),
  chapterList: document.getElementById('chapterList'),
  projectWordsStat: document.getElementById('projectWordsStat'),
  projectReadTimeStat: document.getElementById('projectReadTimeStat'),
  editorProjectHeading: document.getElementById('editorProjectHeading'),
  editorProjectMeta: document.getElementById('editorProjectMeta'),
  chapterTitleInput: document.getElementById('chapterTitleInput'),
  chapterBodyInput: document.getElementById('chapterBodyInput'),
  chapterPreviewPanel: document.getElementById('chapterPreviewPanel'),
  editorWorkspace: document.getElementById('editorWorkspace'),
  editorModeButtons: Array.from(document.querySelectorAll('[data-editor-mode]')),
  chapterWordsMetric: document.getElementById('chapterWordsMetric'),
  chapterReadMetric: document.getElementById('chapterReadMetric'),
  chapterCharactersMetric: document.getElementById('chapterCharactersMetric'),
  chapterSavedMetric: document.getElementById('chapterSavedMetric'),
  addChapterButton: document.getElementById('addChapterButton'),
  editProjectButton: document.getElementById('editProjectButton'),
  openReaderButton: document.getElementById('openReaderButton'),
  printProjectButton: document.getElementById('printProjectButton'),
  duplicateChapterButton: document.getElementById('duplicateChapterButton'),
  moveChapterUpButton: document.getElementById('moveChapterUpButton'),
  moveChapterDownButton: document.getElementById('moveChapterDownButton'),
  exportTxtButton: document.getElementById('exportTxtButton'),
  exportMdButton: document.getElementById('exportMdButton'),
  exportPdfButton: document.getElementById('exportPdfButton'),
  exportPublishedButton: document.getElementById('exportPublishedButton'),
  deleteChapterButton: document.getElementById('deleteChapterButton'),
  readerProjectHeading: document.getElementById('readerProjectHeading'),
  readerProjectMeta: document.getElementById('readerProjectMeta'),
  readerBackToEditorButton: document.getElementById('readerBackToEditorButton'),
  readerExportPdfButton: document.getElementById('readerExportPdfButton'),
  readerOpenPublishedButton: document.getElementById('readerOpenPublishedButton'),
  readerToc: document.getElementById('readerToc'),
  readerArticle: document.getElementById('readerArticle'),
  projectDialog: document.getElementById('projectDialog'),
  projectForm: document.getElementById('projectForm'),
  projectDialogTitle: document.getElementById('projectDialogTitle'),
  projectTitleInput: document.getElementById('projectTitleInput'),
  projectAuthorInput: document.getElementById('projectAuthorInput'),
  projectGenreInput: document.getElementById('projectGenreInput'),
  projectStatusInput: document.getElementById('projectStatusInput'),
  projectSummaryInput: document.getElementById('projectSummaryInput'),
  closeProjectDialogButton: document.getElementById('closeProjectDialogButton'),
  cancelProjectDialogButton: document.getElementById('cancelProjectDialogButton'),
};

const ui = {
  view: 'dashboard',
  editorMode: 'write',
  editingProjectId: null,
  focusMode: false,
};

let saveTimeoutId = null;
let saveStatusTimeoutId = null;
let state = migrateState(loadState());

initializeApp();

function initializeApp() {
  bindEvents();
  ensureSelection();
  syncFromHash();
  renderDashboard();
  renderEditor();
  renderReader();
  renderChrome();
  registerServiceWorker();
  setSaveStatus(state.projects.length ? `Saved locally · ${formatTime(state.ui?.lastSavedAt)}` : 'Ready to write');
}

function bindEvents() {
  document.querySelectorAll('[data-nav-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.navTarget;
      if (target === 'editor') {
        const project = getCurrentProject();
        if (!project) return navigate('dashboard');
        return navigate('editor', { projectId: project.id, chapterId: getCurrentChapter()?.id });
      }
      if (target === 'reader') {
        const project = getCurrentProject();
        if (!project) return navigate('dashboard');
        return navigate('reader', { projectId: project.id });
      }
      navigate('dashboard');
    });
  });

  elements.newProjectButton.addEventListener('click', () => openProjectDialog());
  elements.dashboardNewProjectButton.addEventListener('click', () => openProjectDialog());
  elements.loadSampleButton.addEventListener('click', handleLoadSampleProject);
  elements.exportBackupButton.addEventListener('click', exportBackupJson);
  elements.restoreBackupInput.addEventListener('change', handleRestoreBackup);
  elements.projectSearchInput.addEventListener('input', renderDashboard);
  elements.statusFilterSelect.addEventListener('change', renderDashboard);
  elements.addChapterButton.addEventListener('click', handleAddChapter);
  elements.editProjectButton.addEventListener('click', () => openProjectDialog(getCurrentProject()?.id || null));
  elements.openReaderButton.addEventListener('click', () => {
    const project = getCurrentProject();
    if (!project) return;
    navigate('reader', { projectId: project.id });
  });
  elements.printProjectButton.addEventListener('click', () => {
    const project = getCurrentProject();
    if (!project) return;
    printProject(project);
  });
  elements.duplicateChapterButton.addEventListener('click', handleDuplicateChapter);
  elements.moveChapterUpButton.addEventListener('click', () => handleMoveCurrentChapter(-1));
  elements.moveChapterDownButton.addEventListener('click', () => handleMoveCurrentChapter(1));
  elements.exportTxtButton.addEventListener('click', () => {
    const project = getCurrentProject();
    if (project) exportProjectTxt(project);
  });
  elements.exportMdButton.addEventListener('click', () => {
    const project = getCurrentProject();
    if (project) exportProjectMarkdown(project);
  });
  elements.exportPdfButton.addEventListener('click', () => {
    const project = getCurrentProject();
    if (project) exportProjectPdf(project);
  });
  elements.exportPublishedButton.addEventListener('click', () => {
    const project = getCurrentProject();
    if (project) exportPublishedProjectJson(project);
  });
  elements.deleteChapterButton.addEventListener('click', handleDeleteCurrentChapter);
  elements.readerBackToEditorButton.addEventListener('click', () => {
    const project = getCurrentProject();
    if (!project) return navigate('dashboard');
    navigate('editor', { projectId: project.id, chapterId: getCurrentChapter()?.id });
  });
  elements.readerExportPdfButton.addEventListener('click', () => {
    const project = getCurrentProject();
    if (project) exportProjectPdf(project);
  });
  elements.readerOpenPublishedButton.addEventListener('click', () => {
    const project = getCurrentProject();
    if (!project) return;
    window.open(`./published.html?project=${encodeURIComponent(project.id)}`, '_blank', 'noopener');
  });

  elements.chapterTitleInput.addEventListener('input', (event) => {
    const chapter = getCurrentChapter();
    const project = getCurrentProject();
    if (!chapter || !project) return;
    chapter.title = event.target.value || `Chapter ${getCurrentChapterIndex() + 1}`;
    chapter.updatedAt = new Date().toISOString();
    project.updatedAt = chapter.updatedAt;
    renderChapterList();
    updateEditorMetricsAndPreview();
    renderChrome();
    scheduleSave('Autosaved locally');
  });

  elements.chapterBodyInput.addEventListener('input', (event) => {
    const chapter = getCurrentChapter();
    const project = getCurrentProject();
    if (!chapter || !project) return;
    chapter.content = event.target.value;
    chapter.updatedAt = new Date().toISOString();
    project.updatedAt = chapter.updatedAt;
    updateEditorMetricsAndPreview();
    renderDashboardStats();
    renderChrome();
    scheduleSave('Autosaved locally');
  });

  elements.projectGrid.addEventListener('click', handleProjectGridClick);
  elements.chapterList.addEventListener('click', handleChapterListClick);
  elements.readerToc.addEventListener('click', handleReaderTocClick);

  elements.editorModeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      ui.editorMode = button.dataset.editorMode;
      applyEditorMode();
    });
  });

  elements.focusModeButton.addEventListener('click', () => {
    ui.focusMode = !ui.focusMode;
    document.body.classList.toggle('focus-mode', ui.focusMode);
    elements.focusModeButton.textContent = ui.focusMode ? 'Exit focus' : 'Focus mode';
    closeMobileSidebar();
  });

  elements.mobileSidebarToggle.addEventListener('click', () => {
    elements.sidebar.classList.toggle('is-open');
  });

  elements.projectForm.addEventListener('submit', handleProjectFormSubmit);
  elements.closeProjectDialogButton.addEventListener('click', closeProjectDialog);
  elements.cancelProjectDialogButton.addEventListener('click', closeProjectDialog);

  window.addEventListener('hashchange', syncFromHash);
  window.addEventListener('storage', handleStorageSync);
  window.addEventListener('keydown', handleGlobalShortcuts);
  window.addEventListener('click', (event) => {
    if (window.innerWidth > 900) return;
    if (!elements.sidebar.classList.contains('is-open')) return;
    const clickedInsideSidebar = event.target.closest('#sidebar') || event.target.closest('#mobileSidebarToggle');
    if (!clickedInsideSidebar) closeMobileSidebar();
  });
}

function handleGlobalShortcuts(event) {
  const isSaveShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's';
  if (isSaveShortcut) {
    event.preventDefault();
    commitSave('Saved locally');
  }
  if (event.key === 'Escape') {
    closeMobileSidebar();
    if (elements.projectDialog.open) closeProjectDialog();
  }
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Failed to load saved state:', error);
    return null;
  }
}

function migrateState(raw) {
  const defaultState = {
    version: APP_VERSION,
    projects: [],
    ui: {
      currentProjectId: null,
      currentChapterId: null,
      lastSavedAt: null,
    },
  };

  if (!raw || typeof raw !== 'object') return defaultState;

  const projects = Array.isArray(raw.projects)
    ? raw.projects.map((project, index) => normalizeProject(project, index)).filter(Boolean)
    : [];

  return {
    version: APP_VERSION,
    projects,
    ui: {
      currentProjectId: raw.ui?.currentProjectId || projects[0]?.id || null,
      currentChapterId: raw.ui?.currentChapterId || projects[0]?.chapters?.[0]?.id || null,
      lastSavedAt: raw.ui?.lastSavedAt || null,
    },
  };
}

function normalizeProject(project, index) {
  if (!project || typeof project !== 'object') return null;
  const now = new Date().toISOString();
  const chapters = Array.isArray(project.chapters) && project.chapters.length
    ? project.chapters.map((chapter, chapterIndex) => normalizeChapter(chapter, chapterIndex)).filter(Boolean)
    : [createBlankChapter(0)];

  return {
    id: String(project.id || uid('project')),
    title: String(project.title || `Untitled project ${index + 1}`),
    author: String(project.author || ''),
    genre: String(project.genre || ''),
    status: VALID_STATUSES.includes(project.status) ? project.status : 'draft',
    summary: String(project.summary || ''),
    createdAt: String(project.createdAt || now),
    updatedAt: String(project.updatedAt || now),
    chapters,
  };
}

function normalizeChapter(chapter, index) {
  if (!chapter || typeof chapter !== 'object') return null;
  const now = new Date().toISOString();
  return {
    id: String(chapter.id || uid('chapter')),
    title: String(chapter.title || `Chapter ${index + 1}`),
    content: String(chapter.content || ''),
    createdAt: String(chapter.createdAt || now),
    updatedAt: String(chapter.updatedAt || now),
  };
}

function createBlankChapter(index = 0) {
  const now = new Date().toISOString();
  return {
    id: uid('chapter'),
    title: `Chapter ${index + 1}`,
    content: '',
    createdAt: now,
    updatedAt: now,
  };
}

function createProjectFromForm(data) {
  const now = new Date().toISOString();
  return {
    id: uid('project'),
    title: data.title.trim(),
    author: data.author.trim(),
    genre: data.genre.trim(),
    status: VALID_STATUSES.includes(data.status) ? data.status : 'draft',
    summary: data.summary.trim(),
    createdAt: now,
    updatedAt: now,
    chapters: [createBlankChapter(0)],
  };
}

function ensureSelection() {
  const currentProject = getCurrentProject();
  if (!currentProject) {
    state.ui.currentProjectId = state.projects[0]?.id || null;
  }
  const selectedProject = getCurrentProject();
  if (!selectedProject) {
    state.ui.currentChapterId = null;
    return;
  }
  const currentChapter = getCurrentChapter();
  if (!currentChapter) {
    state.ui.currentChapterId = selectedProject.chapters[0]?.id || null;
  }
}

function getCurrentProject() {
  return state.projects.find((project) => project.id === state.ui.currentProjectId) || null;
}

function getCurrentChapter() {
  const project = getCurrentProject();
  if (!project) return null;
  return project.chapters.find((chapter) => chapter.id === state.ui.currentChapterId) || null;
}

function getCurrentChapterIndex() {
  const project = getCurrentProject();
  if (!project) return -1;
  return project.chapters.findIndex((chapter) => chapter.id === state.ui.currentChapterId);
}

function setCurrentProject(projectId) {
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) return;
  state.ui.currentProjectId = project.id;
  state.ui.currentChapterId = project.chapters[0]?.id || null;
}

function setCurrentChapter(projectId, chapterId) {
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) return;
  const chapter = project.chapters.find((item) => item.id === chapterId) || project.chapters[0] || null;
  state.ui.currentProjectId = project.id;
  state.ui.currentChapterId = chapter?.id || null;
}

function syncFromHash() {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (!hash) {
    ui.view = state.projects.length ? 'editor' : 'dashboard';
    if (ui.view === 'editor') {
      ensureSelection();
    }
    renderAllViews();
    return;
  }

  const [view, projectId, chapterId] = hash.split('/');
  if (!['dashboard', 'editor', 'reader'].includes(view)) {
    navigate('dashboard');
    return;
  }

  ui.view = view;

  if ((view === 'editor' || view === 'reader') && projectId) {
    const project = state.projects.find((item) => item.id === projectId);
    if (project) {
      state.ui.currentProjectId = project.id;
      if (chapterId && view === 'editor') {
        const chapter = project.chapters.find((item) => item.id === chapterId);
        state.ui.currentChapterId = chapter?.id || project.chapters[0]?.id || null;
      } else if (!state.ui.currentChapterId || !project.chapters.some((item) => item.id === state.ui.currentChapterId)) {
        state.ui.currentChapterId = project.chapters[0]?.id || null;
      }
    }
  }

  if ((view === 'editor' || view === 'reader') && !getCurrentProject()) {
    ui.view = 'dashboard';
  }

  ensureSelection();
  renderAllViews();
}

function navigate(view, { projectId = getCurrentProject()?.id || '', chapterId = getCurrentChapter()?.id || '' } = {}) {
  closeMobileSidebar();
  if (view === 'dashboard') {
    window.location.hash = '/dashboard';
    return;
  }
  if (view === 'editor') {
    window.location.hash = `/editor/${projectId || ''}/${chapterId || ''}`;
    return;
  }
  if (view === 'reader') {
    window.location.hash = `/reader/${projectId || ''}`;
  }
}

function renderAllViews() {
  renderDashboard();
  renderEditor();
  renderReader();
  renderChrome();
}

function renderChrome() {
  elements.dashboardView.classList.toggle('hidden', ui.view !== 'dashboard');
  elements.editorView.classList.toggle('hidden', ui.view !== 'editor');
  elements.readerView.classList.toggle('hidden', ui.view !== 'reader');

  const project = getCurrentProject();

  document.querySelectorAll('[data-nav-target]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.navTarget === ui.view);
  });

  elements.continueWritingNav.disabled = !project;
  elements.readerNavButton.disabled = !project;
  elements.continueWritingNav.classList.toggle('is-disabled', !project);
  elements.readerNavButton.classList.toggle('is-disabled', !project);

  const viewConfig = {
    dashboard: {
      eyebrow: 'Project dashboard',
      title: 'Your writing home',
    },
    editor: {
      eyebrow: 'Editor',
      title: project ? project.title : 'Open a project',
    },
    reader: {
      eyebrow: 'Reader mode',
      title: project ? project.title : 'Preview your manuscript',
    },
  }[ui.view];

  elements.viewEyebrow.textContent = viewConfig.eyebrow;
  elements.viewTitle.textContent = viewConfig.title;
}

function renderDashboard() {
  renderDashboardStats();

  const searchTerm = elements.projectSearchInput.value.trim().toLowerCase();
  const statusFilter = elements.statusFilterSelect.value;

  const filteredProjects = state.projects.filter((project) => {
    const searchTarget = `${project.title} ${project.summary} ${project.genre} ${project.author}`.toLowerCase();
    const matchesSearch = !searchTerm || searchTarget.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!filteredProjects.length) {
    elements.projectGrid.innerHTML = '';
    if (state.projects.length) {
      elements.projectGrid.innerHTML = `
        <article class="empty-state card">
          <p class="eyebrow">No matching projects</p>
          <h3>Nothing fits the current search yet.</h3>
          <p>Try clearing the search field or switching the status filter to see the rest of your library.</p>
        </article>
      `;
      return;
    }
    const emptyNode = elements.emptyDashboardTemplate.content.firstElementChild.cloneNode(true);
    emptyNode.querySelectorAll('[data-empty-action]').forEach((button) => {
      button.addEventListener('click', () => {
        if (button.dataset.emptyAction === 'create') openProjectDialog();
        if (button.dataset.emptyAction === 'sample') handleLoadSampleProject();
      });
    });
    elements.projectGrid.appendChild(emptyNode);
    return;
  }

  elements.projectGrid.innerHTML = filteredProjects
    .map((project) => {
      const stats = getProjectStats(project);
      return `
        <article class="project-card">
          <div class="project-card-header">
            <div>
              <div class="status-pill" data-status="${escapeHtml(project.status)}">${formatStatus(project.status)}</div>
              <h4>${escapeHtml(project.title)}</h4>
              <time datetime="${escapeHtml(project.updatedAt)}">Updated ${formatRelativeDate(project.updatedAt)}</time>
            </div>
            <button class="icon-button compact" data-project-action="delete" data-project-id="${project.id}" aria-label="Delete project">×</button>
          </div>

          <div class="project-metadata">
            <span class="project-meta-chip"><span>Chapters</span> ${stats.chapters}</span>
            <span class="project-meta-chip"><span>Words</span> ${formatNumber(stats.words)}</span>
            <span class="project-meta-chip"><span>Read</span> ${formatReadTime(stats.words)}</span>
          </div>

          <p class="project-summary">${escapeHtml(project.summary || 'No summary yet. Use this space for the premise, mood, or drafting notes.')}</p>

          <div class="project-card-actions">
            <button class="primary-button compact" data-project-action="open" data-project-id="${project.id}">Open editor</button>
            <button class="secondary-button compact" data-project-action="reader" data-project-id="${project.id}">Reader</button>
            <button class="secondary-button compact" data-project-action="details" data-project-id="${project.id}">Details</button>
            <button class="secondary-button compact" data-project-action="md" data-project-id="${project.id}">Export MD</button>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderDashboardStats() {
  const totals = state.projects.reduce(
    (accumulator, project) => {
      const stats = getProjectStats(project);
      accumulator.projects += 1;
      accumulator.chapters += stats.chapters;
      accumulator.words += stats.words;
      return accumulator;
    },
    { projects: 0, chapters: 0, words: 0 }
  );

  elements.totalProjectsStat.textContent = formatNumber(totals.projects);
  elements.totalChaptersStat.textContent = formatNumber(totals.chapters);
  elements.totalWordsStat.textContent = formatNumber(totals.words);
}

function renderEditor() {
  const project = getCurrentProject();
  const chapter = getCurrentChapter();
  const hasProject = Boolean(project && chapter);

  elements.chapterTitleInput.disabled = !hasProject;
  elements.chapterBodyInput.disabled = !hasProject;
  elements.addChapterButton.disabled = !project;
  elements.editProjectButton.disabled = !project;
  elements.openReaderButton.disabled = !project;
  elements.printProjectButton.disabled = !project;
  elements.duplicateChapterButton.disabled = !chapter;
  elements.moveChapterUpButton.disabled = !chapter;
  elements.moveChapterDownButton.disabled = !chapter;
  elements.exportTxtButton.disabled = !project;
  elements.exportMdButton.disabled = !project;
  elements.exportPdfButton.disabled = !project;
  elements.exportPublishedButton.disabled = !project;
  elements.deleteChapterButton.disabled = !chapter;

  if (!hasProject) {
    elements.editorProjectHeading.textContent = 'Select a project';
    elements.editorProjectMeta.textContent = 'Create a book from the dashboard or load the sample project.';
    elements.chapterList.innerHTML = '<p class="preview-empty">Your chapter list will appear here once a project is open.</p>';
    elements.projectWordsStat.textContent = '0';
    elements.projectReadTimeStat.textContent = '0 min';
    elements.chapterTitleInput.value = '';
    elements.chapterBodyInput.value = '';
    elements.chapterPreviewPanel.innerHTML = '<p class="preview-empty">Preview your chapter here.</p>';
    updateEditorMetrics(null);
    applyEditorMode();
    return;
  }

  const stats = getProjectStats(project);
  elements.editorProjectHeading.textContent = project.title;
  elements.editorProjectMeta.textContent = `${project.author || 'Unnamed author'} · ${project.genre || 'No genre'} · ${formatStatus(project.status)}`;
  elements.projectWordsStat.textContent = formatNumber(stats.words);
  elements.projectReadTimeStat.textContent = formatReadTime(stats.words);
  elements.chapterTitleInput.value = chapter.title;
  elements.chapterBodyInput.value = chapter.content;
  renderChapterList();
  updateEditorMetricsAndPreview();
  applyEditorMode();
}

function renderChapterList() {
  const project = getCurrentProject();
  if (!project) return;
  elements.chapterList.innerHTML = project.chapters
    .map((chapter, index) => {
      const words = countWords(chapter.content);
      return `
        <button class="chapter-item ${chapter.id === state.ui.currentChapterId ? 'is-active' : ''}" data-chapter-id="${chapter.id}">
          <span class="chapter-item-main">
            <small>Chapter ${index + 1}</small>
            <h4>${escapeHtml(chapter.title || `Chapter ${index + 1}`)}</h4>
            <small>${formatNumber(words)} words · ${formatRelativeDate(chapter.updatedAt)}</small>
          </span>
        </button>
      `;
    })
    .join('');
}

function updateEditorMetricsAndPreview() {
  const chapter = getCurrentChapter();
  updateEditorMetrics(chapter);
  if (!chapter) {
    elements.chapterPreviewPanel.innerHTML = '<p class="preview-empty">Preview your chapter here.</p>';
    return;
  }
  elements.chapterPreviewPanel.innerHTML = renderRichTextToHtml(chapter.title, chapter.content);
}

function updateEditorMetrics(chapter) {
  if (!chapter) {
    elements.chapterWordsMetric.textContent = '0';
    elements.chapterReadMetric.textContent = '0 min';
    elements.chapterCharactersMetric.textContent = '0';
    elements.chapterSavedMetric.textContent = '—';
    return;
  }
  const words = countWords(chapter.content);
  elements.chapterWordsMetric.textContent = formatNumber(words);
  elements.chapterReadMetric.textContent = formatReadTime(words);
  elements.chapterCharactersMetric.textContent = formatNumber(chapter.content.length);
  elements.chapterSavedMetric.textContent = formatTime(chapter.updatedAt);
}

function renderReader() {
  const project = getCurrentProject();
  if (!project) {
    elements.readerProjectHeading.textContent = 'Preview';
    elements.readerProjectMeta.textContent = 'Open a project to see the full manuscript in reader mode.';
    elements.readerToc.innerHTML = '<p class="preview-empty">No table of contents yet.</p>';
    elements.readerArticle.innerHTML = '<p class="reader-empty">Select a project to preview it as a formatted book.</p>';
    return;
  }

  const stats = getProjectStats(project);
  elements.readerProjectHeading.textContent = project.title;
  elements.readerProjectMeta.textContent = `${project.author || 'Unnamed author'} · ${formatNumber(stats.words)} words · ${formatReadTime(stats.words)}`;
  elements.readerToc.innerHTML = project.chapters
    .map(
      (chapter, index) => `
        <button class="toc-item" data-toc-target="reader-chapter-${index + 1}">
          <strong>${escapeHtml(chapter.title || `Chapter ${index + 1}`)}</strong>
          <span>Chapter ${index + 1}</span>
        </button>
      `
    )
    .join('');

  elements.readerArticle.innerHTML = buildReaderMarkup(project);
}

function buildReaderMarkup(project) {
  const stats = getProjectStats(project);
  const chaptersHtml = project.chapters
    .map((chapter, index) => {
      const chapterTitle = chapter.title || `Chapter ${index + 1}`;
      return `
        <section class="reader-chapter" id="reader-chapter-${index + 1}">
          <div class="reader-chapter-index">${String(index + 1).padStart(2, '0')}</div>
          <div class="reader-chapter-main prose">
            <div class="reader-chapter-heading">
              <h2>${escapeHtml(chapterTitle)}</h2>
              <p>${formatNumber(countWords(chapter.content))} words</p>
            </div>
            ${renderBodyOnlyHtml(chapter.content)}
            <div class="reader-divider"></div>
          </div>
        </section>
      `;
    })
    .join('');

  return `
    <div class="reader-project-intro prose">
      <p class="eyebrow">Beautiful preview</p>
      <h1>${escapeHtml(project.title)}</h1>
      <p>${escapeHtml(project.summary || 'This manuscript has no summary yet. Reader mode shows the full draft in a calm, typeset layout.')}</p>
      <p><strong>${escapeHtml(project.author || 'Unnamed author')}</strong> · ${project.genre ? escapeHtml(project.genre) + ' · ' : ''}${formatNumber(stats.words)} words · ${formatReadTime(stats.words)}</p>
    </div>
    ${chaptersHtml}
  `;
}

function applyEditorMode() {
  elements.editorModeButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.editorMode === ui.editorMode);
  });
  elements.editorWorkspace.className = `editor-workspace mode-${ui.editorMode}`;
  const showEditor = ui.editorMode !== 'preview';
  const showPreview = ui.editorMode !== 'write';
  elements.chapterBodyInput.classList.toggle('hidden', !showEditor);
  elements.chapterPreviewPanel.classList.toggle('hidden', !showPreview);
}

function handleProjectGridClick(event) {
  const actionButton = event.target.closest('[data-project-action]');
  if (!actionButton) return;
  const projectId = actionButton.dataset.projectId;
  const action = actionButton.dataset.projectAction;
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) return;

  if (action === 'open') {
    state.ui.currentProjectId = project.id;
    state.ui.currentChapterId = project.chapters[0]?.id || null;
    navigate('editor', { projectId: project.id, chapterId: state.ui.currentChapterId });
    return;
  }

  if (action === 'reader') {
    state.ui.currentProjectId = project.id;
    state.ui.currentChapterId = project.chapters[0]?.id || null;
    navigate('reader', { projectId: project.id });
    return;
  }

  if (action === 'details') {
    openProjectDialog(project.id);
    return;
  }

  if (action === 'md') {
    exportProjectMarkdown(project);
    return;
  }

  if (action === 'delete') {
    handleDeleteProject(project.id);
  }
}

function handleChapterListClick(event) {
  const chapterButton = event.target.closest('[data-chapter-id]');
  if (!chapterButton) return;
  const project = getCurrentProject();
  if (!project) return;
  state.ui.currentChapterId = chapterButton.dataset.chapterId;
  renderEditor();
  renderChrome();
  navigate('editor', { projectId: project.id, chapterId: state.ui.currentChapterId });
}

function handleReaderTocClick(event) {
  const tocButton = event.target.closest('[data-toc-target]');
  if (!tocButton) return;
  const target = document.getElementById(tocButton.dataset.tocTarget);
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function handleAddChapter() {
  const project = getCurrentProject();
  if (!project) return;
  const chapter = createBlankChapter(project.chapters.length);
  chapter.title = `Chapter ${project.chapters.length + 1}`;
  project.chapters.push(chapter);
  project.updatedAt = new Date().toISOString();
  state.ui.currentChapterId = chapter.id;
  renderEditor();
  renderDashboard();
  renderReader();
  renderChrome();
  scheduleSave('Chapter added');
  navigate('editor', { projectId: project.id, chapterId: chapter.id });
  elements.chapterBodyInput.focus();
}

function handleDuplicateChapter() {
  const project = getCurrentProject();
  const chapter = getCurrentChapter();
  if (!project || !chapter) return;
  const index = getCurrentChapterIndex();
  const copy = {
    ...JSON.parse(JSON.stringify(chapter)),
    id: uid('chapter'),
    title: `${chapter.title} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  project.chapters.splice(index + 1, 0, copy);
  project.updatedAt = copy.updatedAt;
  state.ui.currentChapterId = copy.id;
  renderEditor();
  renderDashboard();
  renderReader();
  renderChrome();
  scheduleSave('Chapter duplicated');
}

function handleMoveCurrentChapter(direction) {
  const project = getCurrentProject();
  const chapter = getCurrentChapter();
  if (!project || !chapter) return;
  const currentIndex = getCurrentChapterIndex();
  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= project.chapters.length) return;
  const [movedChapter] = project.chapters.splice(currentIndex, 1);
  project.chapters.splice(targetIndex, 0, movedChapter);
  project.updatedAt = new Date().toISOString();
  renderEditor();
  renderReader();
  renderDashboard();
  scheduleSave('Chapter reordered');
}

function handleDeleteCurrentChapter() {
  const project = getCurrentProject();
  const chapter = getCurrentChapter();
  if (!project || !chapter) return;
  if (project.chapters.length === 1) {
    window.alert('Every project needs at least one chapter. Duplicate it first if you want to keep a copy.');
    return;
  }
  const confirmed = window.confirm(`Delete "${chapter.title}"? This action cannot be undone inside the app.`);
  if (!confirmed) return;
  const chapterIndex = getCurrentChapterIndex();
  project.chapters = project.chapters.filter((item) => item.id !== chapter.id);
  project.updatedAt = new Date().toISOString();
  state.ui.currentChapterId = project.chapters[Math.max(0, chapterIndex - 1)]?.id || project.chapters[0]?.id || null;
  renderEditor();
  renderDashboard();
  renderReader();
  renderChrome();
  scheduleSave('Chapter deleted');
}

function handleDeleteProject(projectId) {
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) return;
  const confirmed = window.confirm(`Delete the entire project "${project.title}"? Make a backup first if you are unsure.`);
  if (!confirmed) return;
  state.projects = state.projects.filter((item) => item.id !== projectId);
  if (state.ui.currentProjectId === projectId) {
    state.ui.currentProjectId = state.projects[0]?.id || null;
    state.ui.currentChapterId = state.projects[0]?.chapters?.[0]?.id || null;
  }
  ensureSelection();
  if (!state.projects.length) {
    ui.view = 'dashboard';
    window.location.hash = '/dashboard';
  }
  renderAllViews();
  scheduleSave('Project deleted');
}

function openProjectDialog(projectId = null) {
  const project = state.projects.find((item) => item.id === projectId) || null;
  ui.editingProjectId = project?.id || null;
  elements.projectDialogTitle.textContent = project ? 'Edit project' : 'New project';
  elements.projectTitleInput.value = project?.title || '';
  elements.projectAuthorInput.value = project?.author || '';
  elements.projectGenreInput.value = project?.genre || '';
  elements.projectStatusInput.value = project?.status || 'draft';
  elements.projectSummaryInput.value = project?.summary || '';
  elements.projectDialog.showModal();
  setTimeout(() => elements.projectTitleInput.focus(), 40);
}

function closeProjectDialog() {
  ui.editingProjectId = null;
  if (elements.projectDialog.open) elements.projectDialog.close();
}

function handleProjectFormSubmit(event) {
  event.preventDefault();
  const formData = {
    title: elements.projectTitleInput.value,
    author: elements.projectAuthorInput.value,
    genre: elements.projectGenreInput.value,
    status: elements.projectStatusInput.value,
    summary: elements.projectSummaryInput.value,
  };

  if (!formData.title.trim()) {
    window.alert('Give the project a title first.');
    return;
  }

  if (ui.editingProjectId) {
    const project = state.projects.find((item) => item.id === ui.editingProjectId);
    if (!project) return;
    project.title = formData.title.trim();
    project.author = formData.author.trim();
    project.genre = formData.genre.trim();
    project.status = VALID_STATUSES.includes(formData.status) ? formData.status : 'draft';
    project.summary = formData.summary.trim();
    project.updatedAt = new Date().toISOString();
    scheduleSave('Project updated');
  } else {
    const newProject = createProjectFromForm(formData);
    state.projects.unshift(newProject);
    state.ui.currentProjectId = newProject.id;
    state.ui.currentChapterId = newProject.chapters[0].id;
    scheduleSave('Project created');
    navigate('editor', { projectId: newProject.id, chapterId: newProject.chapters[0].id });
  }

  closeProjectDialog();
  renderAllViews();
}

function handleLoadSampleProject() {
  const existing = state.projects.find((project) => project.title === 'The Lamps at Alder Quay');
  if (existing) {
    state.ui.currentProjectId = existing.id;
    state.ui.currentChapterId = existing.chapters[0]?.id || null;
    navigate('editor', { projectId: existing.id, chapterId: state.ui.currentChapterId });
    return;
  }

  const sample = createSampleProject();
  state.projects.unshift(sample);
  state.ui.currentProjectId = sample.id;
  state.ui.currentChapterId = sample.chapters[0].id;
  renderAllViews();
  scheduleSave('Sample project loaded');
  navigate('editor', { projectId: sample.id, chapterId: sample.chapters[0].id });
}

function exportProjectTxt(project) {
  const fileName = `${slugify(project.title)}.txt`;
  downloadBlob(fileName, 'text/plain;charset=utf-8', buildPlainTextExport(project));
  setSaveStatus(`Downloaded ${fileName}`);
}

function exportProjectMarkdown(project) {
  const fileName = `${slugify(project.title)}.md`;
  downloadBlob(fileName, 'text/markdown;charset=utf-8', buildMarkdownExport(project));
  setSaveStatus(`Downloaded ${fileName}`);
}

function exportPublishedProjectJson(project) {
  const payload = {
    app: APP_NAME,
    generatedAt: new Date().toISOString(),
    project,
  };
  downloadBlob('published-project.json', 'application/json;charset=utf-8', JSON.stringify(payload, null, 2));
  setSaveStatus('Downloaded published-project.json');
}

function exportBackupJson() {
  const payload = {
    app: APP_NAME,
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    storageKey: STORAGE_KEY,
    state,
  };
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(`${slugify(APP_NAME)}-backup-${stamp}.json`, 'application/json;charset=utf-8', JSON.stringify(payload, null, 2));
  setSaveStatus('Backup downloaded');
}

function handleRestoreBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || '{}'));
      const imported = migrateState(parsed.state || parsed);
      if (!imported.projects.length) {
        window.alert('That file does not look like a Stilldraft backup.');
        return;
      }

      const shouldReplace = window.confirm('Replace your current library with the imported backup? Press Cancel to merge instead.');
      if (shouldReplace) {
        state = imported;
      } else {
        const mergedProjects = [...state.projects];
        imported.projects.forEach((project) => {
          const cloned = JSON.parse(JSON.stringify(project));
          if (mergedProjects.some((item) => item.id === cloned.id)) {
            cloned.id = uid('project');
            cloned.chapters = cloned.chapters.map((chapter) => ({ ...chapter, id: uid('chapter') }));
          }
          mergedProjects.unshift(cloned);
        });
        state.projects = mergedProjects;
      }

      ensureSelection();
      commitSave('Backup restored');
      renderAllViews();
    } catch (error) {
      console.error('Failed to restore backup:', error);
      window.alert('The selected file could not be read as JSON.');
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

function printProject(project) {
  navigate('reader', { projectId: project.id });
  window.setTimeout(() => window.print(), 150);
}

function exportProjectPdf(project) {
  const pdfBytes = buildPdfBytes(project);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const fileName = `${slugify(project.title)}.pdf`;
  triggerDownload(blob, fileName);
  setSaveStatus(`Downloaded ${fileName}`);
}

function buildPlainTextExport(project) {
  const lines = [];
  lines.push(project.title);
  if (project.author) lines.push(`By ${project.author}`);
  if (project.genre) lines.push(`Genre: ${project.genre}`);
  if (project.summary) {
    lines.push('');
    lines.push(project.summary);
  }
  lines.push('');
  lines.push('='.repeat(56));
  lines.push('');
  project.chapters.forEach((chapter, index) => {
    lines.push(`Chapter ${index + 1}: ${chapter.title}`);
    lines.push('');
    lines.push(chapter.content.trim());
    lines.push('');
  });
  return lines.join('\n');
}

function buildMarkdownExport(project) {
  const lines = [];
  lines.push(`# ${project.title}`);
  if (project.author) lines.push(`**By ${project.author}**`);
  if (project.genre) lines.push(`*${project.genre}*`);
  if (project.summary) {
    lines.push('');
    lines.push(`> ${project.summary.replace(/\n/g, '\n> ')}`);
  }
  lines.push('');
  project.chapters.forEach((chapter, index) => {
    lines.push(`## Chapter ${index + 1}: ${chapter.title}`);
    lines.push('');
    lines.push(chapter.content.trim());
    lines.push('');
  });
  return lines.join('\n');
}

function buildPdfBytes(project) {
  const normalizedLines = buildPdfLines(project);
  const linesPerPage = 44;
  const pages = [];
  for (let index = 0; index < normalizedLines.length; index += linesPerPage) {
    pages.push(normalizedLines.slice(index, index + linesPerPage));
  }
  if (!pages.length) pages.push(['']);

  const objects = [];
  const pageObjectIds = [];
  const contentObjectIds = [];
  const pagesRootId = 2;
  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[1] = '';

  pages.forEach((pageLines) => {
    const pageObjectId = objects.length + 1;
    const contentObjectId = pageObjectId + 1;
    pageObjectIds.push(pageObjectId);
    contentObjectIds.push(contentObjectId);
    objects.push(`<< /Type /Page /Parent ${pagesRootId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> /Contents ${contentObjectId} 0 R >>`);
    const contentStream = createPdfContentStream(pageLines);
    objects.push(`<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`);
  });

  objects[1] = `<< /Type /Pages /Count ${pageObjectIds.length} /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] >>`;
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>');

  let pdf = '%PDF-1.4\n%Stilldraft\n';
  const offsets = [0];
  objects.forEach((objectBody, index) => {
    offsets[index + 1] = pdf.length;
    pdf += `${index + 1} 0 obj\n${objectBody}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function buildPdfLines(project) {
  const lines = [];
  const summaryWidth = 78;
  const chapterWidth = 86;
  lines.push(sanitizePdfLine(project.title.toUpperCase()));
  if (project.author) lines.push(sanitizePdfLine(`By ${project.author}`));
  if (project.genre) lines.push(sanitizePdfLine(project.genre));
  lines.push('');
  if (project.summary) {
    wrapTextForPdf(project.summary, summaryWidth).forEach((line) => lines.push(line));
    lines.push('');
  }
  project.chapters.forEach((chapter, index) => {
    lines.push(sanitizePdfLine(`Chapter ${index + 1}: ${chapter.title}`));
    lines.push('');
    const bodyLines = chapter.content.split(/\n/);
    bodyLines.forEach((rawLine) => {
      const trimmed = rawLine.trim();
      if (!trimmed) {
        lines.push('');
        return;
      }
      if (/^(\*{3,}|-{3,})$/.test(trimmed)) {
        lines.push('* * *');
        lines.push('');
        return;
      }
      wrapTextForPdf(trimmed, chapterWidth).forEach((line) => lines.push(line));
    });
    lines.push('');
    lines.push('');
  });
  return lines;
}

function wrapTextForPdf(text, width) {
  const safeText = sanitizePdfLine(text);
  const words = safeText.split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const wrapped = [];
  let line = '';
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > width && line) {
      wrapped.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) wrapped.push(line);
  return wrapped;
}

function sanitizePdfLine(text) {
  return String(text || '')
    .replace(/[…]/g, '...')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, '-')
    .replace(/•/g, '*')
    .replace(/\t/g, ' ')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?')
    .trimEnd();
}

function createPdfContentStream(lines) {
  const escapedLines = lines.map((line) => escapePdfText(line));
  const streamLines = ['BT', '/F1 12 Tf', '16 TL', '72 740 Td'];
  escapedLines.forEach((line, index) => {
    if (index === 0) {
      streamLines.push(`(${line}) Tj`);
    } else {
      streamLines.push('T*');
      streamLines.push(`(${line}) Tj`);
    }
  });
  streamLines.push('ET');
  return streamLines.join('\n');
}

function escapePdfText(text) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function renderRichTextToHtml(title, body) {
  return `<article class="prose"><h2>${escapeHtml(title || 'Untitled chapter')}</h2>${renderBodyOnlyHtml(body)}</article>`;
}

function renderBodyOnlyHtml(body) {
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
    if (trimmed.startsWith('### ')) {
      flushParagraph();
      blocks.push(`<h3>${escapeHtml(trimmed.slice(4))}</h3>`);
      return;
    }
    if (trimmed.startsWith('## ')) {
      flushParagraph();
      blocks.push(`<h2>${escapeHtml(trimmed.slice(3))}</h2>`);
      return;
    }
    if (trimmed.startsWith('# ')) {
      flushParagraph();
      blocks.push(`<h1>${escapeHtml(trimmed.slice(2))}</h1>`);
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
  return blocks.join('') || '<p class="preview-empty">This chapter is still blank.</p>';
}

function countWords(text) {
  const matches = String(text || '').match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu);
  return matches ? matches.length : 0;
}

function getProjectStats(project) {
  const words = project.chapters.reduce((total, chapter) => total + countWords(chapter.content), 0);
  return {
    chapters: project.chapters.length,
    words,
  };
}

function scheduleSave(message = 'Saved locally') {
  window.clearTimeout(saveTimeoutId);
  setSaveStatus('Saving…');
  saveTimeoutId = window.setTimeout(() => commitSave(message), 320);
}

function commitSave(message = 'Saved locally') {
  window.clearTimeout(saveTimeoutId);
  state.ui.lastSavedAt = new Date().toISOString();
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setSaveStatus(`${message} · ${formatTime(state.ui.lastSavedAt)}`);
  } catch (error) {
    console.error('Failed to save state:', error);
    setSaveStatus('Save failed — export a backup', true);
  }
}

function setSaveStatus(message, isWarning = false) {
  elements.saveStatus.textContent = message;
  elements.saveStatus.style.background = isWarning ? 'rgba(163, 83, 66, 0.12)' : '';
  elements.saveStatus.style.color = isWarning ? 'var(--danger)' : '';
  window.clearTimeout(saveStatusTimeoutId);
  if (!isWarning && !message.startsWith('Saving')) {
    saveStatusTimeoutId = window.setTimeout(() => {
      if (state.projects.length) {
        elements.saveStatus.textContent = `Saved locally · ${formatTime(state.ui.lastSavedAt)}`;
      }
      elements.saveStatus.style.background = '';
      elements.saveStatus.style.color = '';
    }, 2400);
  }
}

function handleStorageSync(event) {
  if (event.key !== STORAGE_KEY || !event.newValue) return;
  try {
    state = migrateState(JSON.parse(event.newValue));
    ensureSelection();
    renderAllViews();
    setSaveStatus(`Synced · ${formatTime(state.ui.lastSavedAt)}`);
  } catch (error) {
    console.error('Failed to sync state from another tab:', error);
  }
}

function createSampleProject() {
  const now = new Date().toISOString();
  return {
    id: uid('project'),
    title: 'The Lamps at Alder Quay',
    author: 'Sample Manuscript',
    genre: 'Atmospheric mystery',
    status: 'draft',
    summary:
      'A harbor archivist discovers that every lamp relit on the old quay revives a forgotten memory in the town that built it.',
    createdAt: now,
    updatedAt: now,
    chapters: [
      {
        id: uid('chapter'),
        title: 'Chapter 1 — Salt in the Stairwell',
        content:
          'By the time Mara reached the archive, the tide had already pressed its cold palm against the harbor steps. The building smelled of paper, wet rope, and the faint medicinal sweetness of lamp oil.\n\nShe unlocked the iron grille and paused beneath the stairwell, where a seam of seawater ran down the wall in a silver thread. No rain had fallen for three days.\n\n***\n\nOn the sorting table waited a cedar box she had never seen before. Its brass label was blank, but when she touched the latch, she remembered a voice laughing on the quay—warm, immediate, impossible. It was her own mother, dead these twelve winters, saying, Do not let the lamps go dark all at once.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uid('chapter'),
        title: 'Chapter 2 — The Watchman’s Ledger',
        content:
          'The ledger was hidden inside the cedar box, wrapped in sailcloth the color of old bones. Each page listed a lamp by number, wick length, weather, and a final column labeled Memory Returned.\n\nMost entries were ordinary—names, birthdays, a tune heard from a bakery window—but the final page contained only one line.\n\n# Lamp Thirteen\n\nRelight only when the town is ready to remember what it traded away.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uid('chapter'),
        title: 'Chapter 3 — A Light Along the Breakwater',
        content:
          'At dusk Mara carried the smallest lamp to the breakwater, shielding the glass with her coat. Below her, the sea kept shouldering the stones as if trying to be heard.\n\nWhen the flame caught, the whole harbor inhaled. The fishmonger looked up from his stall. The baker across the square dropped a tray. Somewhere behind Mara, someone whispered a child’s name that had not been spoken in thirty years.\n\n> The town had not forgotten. It had only buried the remembering where no one would trip over it in daylight.',
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}

function downloadBlob(fileName, mimeType, content) {
  const blob = new Blob([content], { type: mimeType });
  triggerDownload(blob, fileName);
}

function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function formatStatus(status) {
  if (status === 'editing') return 'Editing';
  if (status === 'ready') return 'Ready';
  return 'Drafting';
}

function formatReadTime(words) {
  if (!words) return '0 min';
  return `${Math.max(1, Math.ceil(words / READING_WPM))} min`;
}

function formatRelativeDate(value) {
  if (!value) return 'recently';
  const delta = Date.now() - new Date(value).getTime();
  const hours = Math.floor(delta / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatTime(value) {
  if (!value) return 'just now';
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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

function slugify(value) {
  return String(value || 'project')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'project';
}

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-6)}`;
}

function closeMobileSidebar() {
  elements.sidebar.classList.remove('is-open');
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./sw.js');
  } catch (error) {
    console.warn('Service worker registration failed:', error);
  }
}
