<script>
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import { Auth } from '$lib/utils/auth.js';
  import { browser } from '$app/environment';

  export let selectedFile = null;
  export let scope = 'private';

  const dispatch = createEventDispatcher();

  let pagesEl;
  let viewerEl;
  let zoomLevel = 1.0;
  let pdf = null;
  let fileExt = '';
  let dimLabel = '';
  let renderTasks = new Map();

  $: zoomPercent = Math.round(zoomLevel * 100);

  export async function initViewer(file) {
    if (!file) return;
    
    selectedFile = file;
    fileExt = file.type.toLowerCase();
    
    if (!browser) return;
    
    await tick();
    
    if (fileExt === 'pdf') {
      let attempts = 0;
      while (!window.pdfjsLib && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (!window.pdfjsLib) {
        alert('PDF.js library failed to load. Please refresh the page.');
        return;
      }
      
      await initPdfViewer(file.id);
    } else if (['png','jpg','jpeg','gif','webp','bmp','svg'].includes(fileExt)) {
      initImageViewer(file.id);
    } else if (['mp4','webm','ogg'].includes(fileExt)) {
      initVideoViewer(file.id);
    } else if (['mp3','wav','ogg'].includes(fileExt)) {
      initAudioViewer(file.id);
    } else if (['txt','md','json','csv','log'].includes(fileExt)) {
      initTextViewer(file.id);
    }
  }

  export function closeViewer() {
    selectedFile = null;
    pdf = null;
    if (pagesEl) pagesEl.innerHTML = '';
    dimLabel = '';
    dispatch('close');
  }

  async function initPdfViewer(fileId) {
    const pdfjsLib = window.pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const token = Auth.token();

    try {
      const pdfUrl = `/files/${encodeURIComponent(fileId)}`;
      const loadingTask = pdfjsLib.getDocument({
        url: pdfUrl,
        httpHeaders: token ? { Authorization: 'Bearer ' + token } : {},
      });
      
      pdf = await loadingTask.promise;
      
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
      const wCm = (viewport.width * 2.54) / 96;
      const hCm = (viewport.height * 2.54) / 96;
      dimLabel = `${wCm.toFixed(1)} × ${hCm.toFixed(1)} cm`;
      
      const viewerWidth = viewerEl?.clientWidth || 800;
      const scale = Math.min(2.5, Math.max(0.5, (viewerWidth - 32) / viewport.width));
      zoomLevel = scale;
      
      await renderAllPages();
      dispatch('pdfLoaded', { fileId });
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
    dispatch('pagesRendered');
  }

  function initImageViewer(fileId) {
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
      
      const vw = viewerEl?.clientWidth || 800;
      const scale = Math.min(4, Math.max(0.2, (vw - 32) / w));
      zoomLevel = scale;
      img.style.transform = `scale(${scale})`;
    };
    
    img.onerror = () => {
      if (pagesEl) {
        pagesEl.innerHTML = `<div style="padding: 40px; text-align: center; color: #999;">
          <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px;"></i>
          <p>Failed to load image</p>
          <small>The file may be corrupted or not found</small>
        </div>`;
      }
    };
    
    img.src = url;
  }

  function initVideoViewer(fileId) {
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

  function initAudioViewer(fileId) {
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

  function initTextViewer(fileId) {
    const pre = document.createElement('pre');
    pre.style.margin = '16px';
    pre.style.whiteSpace = 'pre-wrap';
    
    if (pagesEl) {
      pagesEl.innerHTML = '';
      pagesEl.appendChild(pre);
    }
    
    const token = Auth.token();
    fetch(`/files/${encodeURIComponent(fileId)}`, {
      headers: token ? { Authorization: 'Bearer ' + token } : {}
    })
      .then(r => r.text())
      .then(t => {
        pre.textContent = t;
        dimLabel = `${t.length} chars`;
      });
  }

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

  function handlePageClick(event) {
    if (fileExt !== 'pdf') return;
    
    const pageDiv = event.target.closest('.page');
    if (!pageDiv) return;
    
    const rect = pageDiv.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    
    dispatch('pageClick', {
      page: parseInt(pageDiv.dataset.page, 10),
      x,
      y
    });
  }

  function handleScopeChange() {
    dispatch('scopeChange', { scope });
  }

  export function renderCommentPins(commentsState) {
    if (!pagesEl) return;
    
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
</script>

<div class="viewer-container">
  <main class="viewer" bind:this={viewerEl}>
    <div class="toolbar">
      <button on:click={handleZoomOut} disabled={!selectedFile}>-</button>
      <span>{zoomPercent}%</span>
      <button on:click={handleZoomIn} disabled={!selectedFile}>+</button>
      <button on:click={handleFit} disabled={!selectedFile}>Fit</button>
      {#if dimLabel}
        <span class="dim-label">{dimLabel}</span>
      {/if}
      <label class="scope-toggle">
        <select bind:value={scope} on:change={handleScopeChange} disabled={!selectedFile}>
          <option value="private">My team (private)</option>
          <option value="public">Public</option>
        </select>
      </label>
      {#if selectedFile}
        <button on:click={closeViewer} class="close-btn">
          <i class="fas fa-times"></i> Close
        </button>
      {:else}
        <span class="no-file-message">
          <i class="fas fa-info-circle"></i> Select a file to preview
        </span>
      {/if}
    </div>
    {#if selectedFile}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div bind:this={pagesEl} on:click={handlePageClick} id="pages"></div>
    {:else}
      <div class="no-file-placeholder">
        <i class="fas fa-file-alt"></i>
        <p>No file selected</p>
        <small>Click the eye icon on any file to preview it here</small>
      </div>
    {/if}
  </main>
</div>

<style>
  .viewer-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #fff;
    overflow: hidden;
    height: 100vh;
  }
  
  .viewer {
    flex: 1;
    overflow-y: auto;
    position: relative;
    background: #f6f8fa;
    display: flex;
    flex-direction: column;
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
    flex-shrink: 0;
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
  
  .toolbar button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #f5f5f5;
  }
  
  .toolbar select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #f5f5f5;
  }
  
  .no-file-message {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #888;
    font-size: 14px;
    font-style: italic;
  }
  
  .no-file-message i {
    color: #0c5489;
  }
  
  .no-file-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: calc(100% - 50px);
    color: #888;
    text-align: center;
    padding: 40px;
  }
  
  .no-file-placeholder i {
    font-size: 64px;
    color: #ddd;
    margin-bottom: 20px;
  }
  
  .no-file-placeholder p {
    margin: 0 0 10px 0;
    font-size: 18px;
    font-weight: 600;
    color: #666;
  }
  
  .no-file-placeholder small {
    color: #999;
    font-size: 14px;
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

  .close-btn {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  #pages {
    padding: 16px;
    flex: 1;
    overflow-y: auto;
  }

  :global(#pages img),
  :global(#pages video),
  :global(#pages audio) {
    display: block;
    margin: 0 auto;
    max-width: 100%;
  }

  :global(#pages pre) {
    background: #fff;
    padding: 20px;
    border-radius: 8px;
    max-width: 900px;
    margin: 0 auto;
    overflow-x: auto;
  }
</style>
