<!-- <script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';

  let pagesEl;
  let viewerEl;
  let commentText = '';
  let commentsState = [];
  let zoomLevel = 1.0;
  let scope = 'private';
  let lastClickPos = null;
  let pdf = null;
  let fileId = '';
  let fileExt = '';
  let dimLabel = '';
  let renderTasks = new Map();
  
  $: zoomPercent = Math.round(zoomLevel * 100);

  onMount(async () => {
    if (!browser) return;

    const token = localStorage.getItem('token');
    if (!token) {
      goto('/login');
      return;
    }

    // Get file ID and extension
    fileId = $page.params.id;
    const urlParams = new URLSearchParams(window.location.search);
    fileExt = urlParams.get('ext') || 'pdf';
    
    if (!fileId || fileId === 'null') {
      console.error('Invalid file ID');
      alert('Invalid file ID');
      goto('/files');
      return;
    }

    // Wait for PDF.js to load
    let attempts = 0;
    while (!window.pdfjsLib && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    // Initialize viewer based on file type
    if (fileExt === 'pdf') {
      await initPdfViewer();
    } else if (['png','jpg','jpeg','gif','webp','bmp','svg'].includes(fileExt)) {
      initImageViewer();
    } else if (['mp4','webm','ogg'].includes(fileExt)) {
      initVideoViewer();
    } else if (['mp3','wav','ogg'].includes(fileExt)) {
      initAudioViewer();
    } else if (['txt','md','json','csv','log'].includes(fileExt)) {
      initTextViewer();
    }
  });

  // PDF Viewer
  async function initPdfViewer() {
    if (!window.pdfjsLib) {
      alert('Failed to load PDF.js library');
      return;
    }

    const pdfjsLib = window.pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const token = localStorage.getItem('token');

    try {
      const loadingTask = pdfjsLib.getDocument({
        url: `/files/${encodeURIComponent(fileId)}`,
        httpHeaders: token ? { Authorization: 'Bearer ' + token } : {},
      });
      
      pdf = await loadingTask.promise;
      
      // Get page dimensions for display
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
      const wCm = (viewport.width * 2.54) / 96;
      const hCm = (viewport.height * 2.54) / 96;
      dimLabel = `${wCm.toFixed(1)} × ${hCm.toFixed(1)} cm`;
      
      // Fit to width
      const viewerWidth = viewerEl?.clientWidth || 800;
      const scale = Math.min(2.5, Math.max(0.5, (viewerWidth - 32) / viewport.width));
      zoomLevel = scale;
      
      await renderAllPages();
      await loadComments();
    } catch (error) {
      console.error('Error loading PDF:', error);
      alert('Failed to load PDF: ' + error.message);
    }
  }

  async function renderPage(pageNumber, scale) {
    if (!pdf) return;
    
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    let container = pagesEl?.querySelector(`[data-page="${pageNumber}"]`);
    if (!container) {
      container = document.createElement('div');
      container.className = 'page';
      container.dataset.page = String(pageNumber);
      const canvas = document.createElement('canvas');
      container.appendChild(canvas);
      pagesEl?.appendChild(container);
    }

    const canvas = container.querySelector('canvas');
    const ctx = canvas.getContext('2d');

    // Cancel previous render
    const prev = renderTasks.get(pageNumber);
    if (prev && typeof prev.cancel === 'function') {
      try { prev.cancel(); } catch(_) {}
    }

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    container.style.width = viewport.width + 'px';
    container.style.height = viewport.height + 'px';

    const task = page.render({ canvasContext: ctx, viewport });
    renderTasks.set(pageNumber, task);

    try {
      await task.promise;
    } catch (e) {
      if (!(e && e.name === 'RenderingCancelledException')) throw e;
    } finally {
      if (renderTasks.get(pageNumber) === task) renderTasks.delete(pageNumber);
    }

    return container;
  }

  async function renderAllPages() {
    if (!pdf || !pagesEl) return;
    
    const jobs = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      jobs.push(renderPage(p, zoomLevel));
    }
    await Promise.all(jobs);
    renderCommentPins();
  }

  // Image Viewer
  function initImageViewer() {
    const url = `/files/${encodeURIComponent(fileId)}`;
    const img = new Image();
    img.style.display = 'block';
    img.style.transformOrigin = 'top left';
    img.draggable = false;
    
    if (pagesEl) {
      pagesEl.innerHTML = '';
      pagesEl.appendChild(img);
    }
    
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      dimLabel = `${w} × ${h} px`;
      
      // Fit to width
      const vw = viewerEl?.clientWidth || 800;
      const scale = Math.min(4, Math.max(0.2, (vw - 32) / w));
      zoomLevel = scale;
      img.style.transform = `scale(${scale})`;
    };
    
    img.src = url;
  }

  // Video Viewer
  function initVideoViewer() {
    const v = document.createElement('video');
    v.controls = true;
    v.style.maxWidth = '100%';
    v.src = `/files/${encodeURIComponent(fileId)}`;
    
    if (pagesEl) {
      pagesEl.innerHTML = '';
      pagesEl.appendChild(v);
    }
    
    v.onloadedmetadata = () => {
      dimLabel = `${v.videoWidth}×${v.videoHeight}`;
    };
  }

  // Audio Viewer
  function initAudioViewer() {
    const a = document.createElement('audio');
    a.controls = true;
    a.src = `/files/${encodeURIComponent(fileId)}`;
    
    if (pagesEl) {
      pagesEl.innerHTML = '';
      pagesEl.appendChild(a);
    }
    
    a.onloadedmetadata = () => {
      dimLabel = `${(a.duration || 0).toFixed(1)}s`;
    };
  }

  // Text Viewer
  function initTextViewer() {
    const pre = document.createElement('pre');
    pre.style.margin = '16px';
    pre.style.whiteSpace = 'pre-wrap';
    
    if (pagesEl) {
      pagesEl.innerHTML = '';
      pagesEl.appendChild(pre);
    }
    
    const token = localStorage.getItem('token');
    fetch(`/files/${encodeURIComponent(fileId)}`, {
      headers: token ? { Authorization: 'Bearer ' + token } : {}
    })
      .then(r => r.text())
      .then(t => {
        pre.textContent = t;
        dimLabel = `${t.length} chars`;
      });
  }

  // Zoom controls
  function handleZoomIn() {
    zoomLevel = Math.min(3, Math.round((zoomLevel + 0.1) * 10) / 10);
    if (fileExt === 'pdf') {
      renderAllPages();
    } else {
      const img = pagesEl?.querySelector('img');
      if (img) img.style.transform = `scale(${zoomLevel})`;
    }
  }

  function handleZoomOut() {
    zoomLevel = Math.max(0.5, Math.round((zoomLevel - 0.1) * 10) / 10);
    if (fileExt === 'pdf') {
      renderAllPages();
    } else {
      const img = pagesEl?.querySelector('img');
      if (img) img.style.transform = `scale(${zoomLevel})`;
    }
  }

  function handleFit() {
    if (fileExt === 'pdf' && pdf) {
      pdf.getPage(1).then(page => {
        const vp = page.getViewport({ scale: 1 });
        const w = viewerEl?.clientWidth || 800;
        zoomLevel = Math.min(2.5, Math.max(0.5, (w - 32) / vp.width));
        renderAllPages();
      });
    } else {
      const img = pagesEl?.querySelector('img');
      if (img && img.naturalWidth) {
        const vw = viewerEl?.clientWidth || 800;
        zoomLevel = Math.min(4, Math.max(0.2, (vw - 32) / img.naturalWidth));
        img.style.transform = `scale(${zoomLevel})`;
      }
    }
  }

  // Comments
  function handlePageClick(event) {
    if (fileExt !== 'pdf') return;
    
    const pageDiv = event.target.closest('.page');
    if (!pageDiv) return;
    
    const rect = pageDiv.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    
    lastClickPos = {
      page: parseInt(pageDiv.dataset.page, 10),
      x,
      y
    };
  }

  function visiblePageOr(fallback = 1) {
    const pages = Array.from(pagesEl?.querySelectorAll('.page') || []);
    for (const el of pages) {
      const r = el.getBoundingClientRect();
      if (r.bottom > 80 && r.top < window.innerHeight - 80) {
        return parseInt(el.dataset.page, 10);
      }
    }
    return fallback;
  }

  async function loadComments() {
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`/pdf/${fileId}/comments?scope=${scope}`, {
        headers: token ? { Authorization: 'Bearer ' + token } : {},
      });
      
      if (response.ok) {
        commentsState = await response.json();
        renderCommentPins();
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }

  async function handleSendComment() {
    if (!commentText.trim()) {
      return;
    }

    const token = localStorage.getItem('token');
    const pos = lastClickPos || { page: visiblePageOr(1), x: 0.5, y: 0.3 };
    
    const payload = {
      file_id: fileId,
      page: pos.page,
      x: pos.x,
      y: pos.y,
      text: commentText.trim(),
      scope,
    };

    // Optimistic update
    const optimistic = {
      ...payload,
      id: 'tmp_' + Date.now(),
      user_id: 'me',
      created_at: new Date().toISOString(),
    };
    
    commentsState = [...commentsState, optimistic];
    const tempText = commentText;
    commentText = '';
    renderCommentPins();

    try {
      const response = await fetch(`/pdf/${fileId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const serverItem = await response.json();
        commentsState = commentsState.map(c => 
          c.id === optimistic.id ? serverItem : c
        );
      } else {
        throw new Error('Failed to save comment');
      }
    } catch (error) {
      console.error('Error saving comment:', error);
      alert('Failed to save comment');
      commentsState = commentsState.filter(c => c.id !== optimistic.id);
      commentText = tempText;
    }
    
    renderCommentPins();
  }

  function renderCommentPins() {
    if (!pagesEl) return;
    
    // Clear existing pins
    pagesEl.querySelectorAll('.pin').forEach(pin => pin.remove());
    
    const byPage = new Map();
    for (const c of commentsState) {
      if (!byPage.has(c.page)) byPage.set(c.page, []);
      byPage.get(c.page).push(c);
    }
    
    byPage.forEach((comments, pageNum) => {
      const container = pagesEl.querySelector(`[data-page="${pageNum}"]`);
      if (!container) return;
      
      comments.forEach(c => {
        const pin = document.createElement('div');
        pin.className = 'pin';
        pin.style.left = c.x * 100 + '%';
        pin.style.top = c.y * 100 + '%';
        pin.textContent = '●';
        pin.title = c.text;
        container.appendChild(pin);
      });
    });
  }

  function handleScopeChange() {
    loadComments();
  }

  $: sortedComments = commentsState
    .slice()
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  $: canSend = commentText.trim().length > 0;
</script>

<svelte:head>
  <title>File Viewer</title>
  <link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
    crossorigin="anonymous"
    referrerpolicy="no-referrer"
  />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
</svelte:head>

<div class="container">
  <aside class="sidebar">
    <header>Comments</header>
    <div class="comments">
      {#each sortedComments as comment}
        <div class="comment">
          <strong>p.{comment.page}</strong> {comment.text}
          <br/>
          <small>{comment.user_id || 'anon'} · {new Date(comment.created_at).toLocaleString()}</small>
        </div>
      {/each}
    </div>
    <div class="new-comment">
      <textarea
        bind:value={commentText}
        placeholder="Add a comment… (click a spot in the PDF first)"
      ></textarea>
      <button on:click={handleSendComment} disabled={!canSend}>Send</button>
    </div>
  </aside>
  
  <main class="viewer" bind:this={viewerEl}>
    <div class="toolbar">
      <button on:click={handleZoomOut}>-</button>
      <span>{zoomPercent}%</span>
      <button on:click={handleZoomIn}>+</button>
      <button on:click={handleFit}>Fit</button>
      {#if dimLabel}
        <span class="dim-label">{dimLabel}</span>
      {/if}
      <label class="scope-toggle">
        <select bind:value={scope} on:change={handleScopeChange}>
          <option value="private">My team (private)</option>
          <option value="public">Public</option>
        </select>
      </label>
      <button on:click={() => goto('/files')} class="back-btn">
        <i class="fas fa-arrow-left"></i> Back
      </button>
    </div>
    
    <div bind:this={pagesEl} on:click={handlePageClick} id="pages"></div>
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
  }
  
  .container {
    display: flex;
    height: 100vh;
    font-family: system-ui;
  }
  
  .sidebar {
    width: 320px;
    border-right: 1px solid #eee;
    display: flex;
    flex-direction: column;
    background: #fff;
  }
  
  .sidebar header {
    padding: 12px 16px;
    border-bottom: 1px solid #eee;
    font-weight: 600;
    color: #0c5489;
  }
  
  .comments {
    flex: 1;
    overflow: auto;
  }
  
  .comment {
    padding: 10px 12px;
    border-bottom: 1px solid #f2f2f2;
  }
  
  .comment small {
    color: #777;
  }
  
  .new-comment {
    padding: 8px;
    border-top: 1px solid #eee;
    display: flex;
    gap: 6px;
  }
  
  .new-comment textarea {
    flex: 1;
    resize: vertical;
    min-height: 42px;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .new-comment button {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    background: #0c5489;
    color: #fff;
    cursor: pointer;
    font-weight: 600;
  }

  .new-comment button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .new-comment button:hover:not(:disabled) {
    background: #094166;
  }
  
  .viewer {
    flex: 1;
    overflow: auto;
    position: relative;
    background: #f6f8fa;
  }
  
  :global(.page) {
    margin: 16px auto;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    position: relative;
    background: #fff;
  }
  
  :global(.pin) {
    position: absolute;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #0c5489;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    cursor: pointer;
    transform: translate(-50%, -100%);
    z-index: 10;
  }
  
  .toolbar {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    gap: 8px;
    padding: 8px;
    background: #fff;
    border-bottom: 1px solid #eee;
    align-items: center;
  }

  .toolbar button {
    padding: 6px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #fff;
    cursor: pointer;
    color: #0c5489;
  }

  .toolbar button:hover {
    background: #f5faff;
  }

  .dim-label {
    margin-left: 8px;
    color: #666;
    font-size: 14px;
  }
  
  .scope-toggle {
    margin-left: auto;
  }

  .scope-toggle select {
    padding: 6px 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #fff;
    color: #333;
  }

  .back-btn {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  #pages {
    padding: 16px;
  }

  #pages img,
  #pages video,
  #pages audio {
    display: block;
    margin: 0 auto;
    max-width: 100%;
  }

  #pages pre {
    background: #fff;
    padding: 20px;
    border-radius: 8px;
    max-width: 900px;
    margin: 0 auto;
    overflow-x: auto;
  }
</style> -->
