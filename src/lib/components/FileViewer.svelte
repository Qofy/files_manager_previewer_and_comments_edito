<script>
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import { Auth } from '$lib/utils/auth.js';
  import { browser } from '$app/environment';
	import { features } from 'process';

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
  let highlights = []; // Store text highlights
  let showHighlightDialog = false;
  let highlightDialogPos = { x: 0, y: 0 };
  let selectedTextData = null;
  let showShareDialog = false;
  let shareUrl = '';
  let copySuccess = false;

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

    await loadHighlights();
  }

 async function loadHighlights() {
    if (!selectedFile?.id) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/pdf/${selectedFile.id}/highlights`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            highlights = await response.json();
            renderHighlights();
        }
    } catch (error) {
        console.error('Failed to load highlights:', error);
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
      container.style.position = 'relative';
      
      const canvas = document.createElement('canvas');
      container.appendChild(canvas);
      
      // Add text layer container
      const textLayer = document.createElement('div');
      textLayer.className = 'textLayer';
      container.appendChild(textLayer);
      
      pagesEl?.appendChild(container);
    }

    const canvas = container.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const textLayer = container.querySelector('.textLayer');

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
      
      // Render text layer
      const textContent = await page.getTextContent();
      textLayer.innerHTML = '';
      textLayer.style.width = viewport.width + 'px';
      textLayer.style.height = viewport.height + 'px';
      textLayer.style.setProperty('--scale-factor', scale);
      
      if (window.pdfjsLib) {
        window.pdfjsLib.renderTextLayer({
          textContentSource: textContent,
          container: textLayer,
          viewport: viewport,
          textDivs: []
        });
      }
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

  function handleTextSelection(event) {
    if (fileExt !== 'pdf') return;
    
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (!selectedText) return;
    
    // Find which page the selection is on
    const range = selection.getRangeAt(0);
    const pageDiv = range.startContainer.parentElement?.closest('.page');
    if (!pageDiv) return;
    
    const pageNumber = parseInt(pageDiv.dataset.page, 10);
    const rect = pageDiv.getBoundingClientRect();
    const rangeRect = range.getBoundingClientRect();
    
    // Calculate relative position within the page
    const x = (rangeRect.left - rect.left) / rect.width;
    const y = (rangeRect.top - rect.top) / rect.height;
    
    // Store selection data
    selectedTextData = {
      text: selectedText,
      page: pageNumber,
      x,
      y,
      rangeRect: {
        x: (rangeRect.left - rect.left) / rect.width,
        y: (rangeRect.top - rect.top) / rect.height,
        width: rangeRect.width / rect.width,
        height: rangeRect.height / rect.height
      }
    };
    
    // Show dialog near the selection
    highlightDialogPos = {
      x: event.clientX,
      y: event.clientY
    };
    showHighlightDialog = true;
  }

 async function addHighlight(color = '#ffeb3b') {
    if (!selectedTextData) return;
    
      const highlight = {
        id: Date.now(),
        text: selectedTextData.text,
        page: selectedTextData.page,
        x: selectedTextData.x,
        y: selectedTextData.y,
        rangeRect: selectedTextData.rangeRect,
        color,
        comment: null
    };
    
    highlights = [...highlights, highlight];
    renderHighlights();
    
    // Save to server
    try {
        const token = localStorage.getItem('token');
        await fetch(`/pdf/${selectedFile.id}/highlights`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(highlight)
        });
    } catch (error) {
        console.error('Failed to save highlight:', error);
    }
    
  
    // Dispatch event to create comment linked to this highlight
    dispatch('highlightCreated', { highlight });
}


  function renderHighlights() {
    if (!pagesEl) return;
    
    // Remove old highlights
    pagesEl.querySelectorAll('.highlight-overlay').forEach(h => h.remove());
    
    highlights.forEach(h => {
      const pageDiv = pagesEl.querySelector(`[data-page="${h.page}"]`);
      if (!pageDiv) return;
      
      const overlay = document.createElement('div');
      overlay.className = 'highlight-overlay';
      overlay.style.left = h.rangeRect.x * 100 + '%';
      overlay.style.top = h.rangeRect.y * 100 + '%';
      overlay.style.width = h.rangeRect.width * 100 + '%';
      overlay.style.height = h.rangeRect.height * 100 + '%';
      overlay.style.backgroundColor = h.color;
      overlay.style.opacity = '0.3';
      overlay.dataset.highlightId = h.id;
      overlay.title = h.text;
      
      overlay.addEventListener('click', () => {
        dispatch('highlightClick', { highlight: h });
      });
      
      pageDiv.appendChild(overlay);
    });
  }

  export function scrollToHighlight(highlightId) {
    const highlightOverlay = pagesEl?.querySelector(`[data-highlight-id="${highlightId}"]`);
    if (!highlightOverlay) return;
    
    // Scroll the highlight into view
    highlightOverlay.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Add a temporary flash effect
    highlightOverlay.style.transition = 'opacity 0.3s';
    highlightOverlay.style.opacity = '0.8';
    setTimeout(() => {
        highlightOverlay.style.opacity = '0.3';
    }, 1000);
  }

  export function scrollToCommentPin(comment) {
    if (!pagesEl || !comment) return;
    
    // Find the page container
    const pageContainer = pagesEl.querySelector(`[data-page="${comment.page}"]`);
    if (!pageContainer) return;
    
    // Scroll the page into view
    pageContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Find and flash all pins on this page (since we can't uniquely identify one pin)
    const pins = pageContainer.querySelectorAll('.pin');
    pins.forEach(pin => {
      pin.style.transition = 'transform 0.3s, color 0.3s';
      pin.style.transform = 'scale(1.5)';
      pin.style.color = '#ff0000';
      setTimeout(() => {
        pin.style.transform = 'scale(1)';
        pin.style.color = '';
      }, 1000);
    });
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

  function handleShare() {
    if (!selectedFile) return;
    
    // Generate share URL
    const baseUrl = browser ? window.location.origin : '';
    shareUrl = `${baseUrl}/share/${selectedFile.id}`;
    showShareDialog = true;
    copySuccess = false;
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      copySuccess = true;
      setTimeout(() => {
        copySuccess = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy URL to clipboard');
    }
  }

  function closeShareDialog() {
    showShareDialog = false;
    copySuccess = false;
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
        <button on:click={handleShare} class="share-btn" title="Share file">
          <i class="fas fa-share-alt"></i> Share
        </button>
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
      <div 
        bind:this={pagesEl} 
        on:click={handlePageClick}
        on:mouseup={handleTextSelection}
        id="pages"
      ></div>
    {:else}
      <div class="no-file-placeholder">
        <i class="fas fa-file-alt"></i>
        <p>No file selected</p>
        <small>Click the eye icon on any file to preview it here</small>
      </div>
    {/if}
  </main>
</div>

{#if showHighlightDialog}
  <div 
    class="highlight-dialog"
    style="left: {highlightDialogPos.x}px; top: {highlightDialogPos.y}px;"
  >
    <button on:click={() => addHighlight('#ffeb3b')} class="color-btn yellow">
      <i class="fas fa-highlighter"></i> Yellow
    </button>
    <button on:click={() => addHighlight('#80ff80')} class="color-btn green">
      <i class="fas fa-highlighter"></i> Green
    </button>
    <button on:click={() => addHighlight('#ff9999')} class="color-btn red">
      <i class="fas fa-highlighter"></i> Red
    </button>
    <button on:click={() => addHighlight('#9999ff')} class="color-btn blue">
      <i class="fas fa-highlighter"></i> Blue
    </button>
    <button on:click={() => showHighlightDialog = false} class="cancel-btn">
      <i class="fas fa-times"></i> Cancel
    </button>
  </div>
{/if}

{#if showShareDialog}
  <div class="share-dialog-overlay" on:click={closeShareDialog}>
    <div class="share-dialog" on:click|stopPropagation>
      <div class="share-dialog-header">
        <h3><i class="fas fa-share-alt"></i> Share File</h3>
        <button class="close-dialog-btn" on:click={closeShareDialog}>
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="share-dialog-body">
        <p>Anyone with this link can view this file and its comments</p>
        
        <div class="share-url-container">
          <input 
            type="text" 
            readonly 
            value={shareUrl}
            class="share-url-input"
            on:click={(e) => e.target.select()}
          />
          <button class="copy-btn" on:click={copyToClipboard}>
            {#if copySuccess}
              <i class="fas fa-check"></i> Copied!
            {:else}
              <i class="fas fa-copy"></i> Copy
            {/if}
          </button>
        </div>
        
        <div class="share-info">
          <i class="fas fa-info-circle"></i>
          <span>File: <strong>{selectedFile?.name}</strong></span>
        </div>
      </div>
    </div>
  </div>
{/if}

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

  /* Text layer for PDF selection */
  :global(.textLayer) {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
    opacity: 0.2;
    line-height: 1.0;
    pointer-events: auto;
  }

  :global(.textLayer > span) {
    color: transparent;
    position: absolute;
    white-space: pre;
    cursor: text;
    transform-origin: 0% 0%;
  }

  :global(.textLayer ::selection) {
    background: rgba(0, 100, 255, 0.3);
  }

  /* Highlight overlays */
  :global(.highlight-overlay) {
    position: absolute;
    pointer-events: auto;
    cursor: pointer;
    border-radius: 2px;
    transition: opacity 0.2s;
  }

  :global(.highlight-overlay:hover) {
    opacity: 0.5 !important;
  }

  /* Highlight dialog */
  .highlight-dialog {
    position: fixed;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    z-index: 1000;
    min-width: 150px;
  }

  .highlight-dialog button {
    padding: 8px 12px;
    border: none;
    background: white;
    cursor: pointer;
    text-align: left;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #333;
  }

  .highlight-dialog button:hover {
    background: #f5f5f5;
  }

  .color-btn.yellow i { color: #f9a825; }
  .color-btn.green i { color: #43a047; }
  .color-btn.red i { color: #e53935; }
  .color-btn.blue i { color: #1e88e5; }

  .cancel-btn {
    border-top: 1px solid #eee !important;
    margin-top: 4px;
    padding-top: 8px !important;
    color: #666 !important;
  }

  /* Share dialog overlay */
  .share-dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  }

  .share-dialog {
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    width: 90%;
    max-width: 500px;
    overflow: hidden;
  }

  .share-dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid #eee;
    background: #f7f9fb;
  }

  .share-dialog-header h3 {
    margin: 0;
    font-size: 18px;
    color: #333;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .share-dialog-header h3 i {
    color: #0c5489;
  }

  .close-dialog-btn {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #666;
    padding: 4px 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }

  .close-dialog-btn:hover {
    background: #e0e0e0;
  }

  .share-dialog-body {
    padding: 24px;
  }

  .share-dialog-body p {
    margin: 0 0 16px 0;
    color: #666;
    font-size: 14px;
  }

  .share-url-container {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .share-url-input {
    flex: 1;
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    font-family: 'Courier New', monospace;
    color: #333;
    background: #f7f9fb;
  }

  .share-url-input:focus {
    outline: none;
    border-color: #0c5489;
  }

  .copy-btn {
    padding: 10px 16px;
    background: #0c5489;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    transition: background 0.2s;
  }

  .copy-btn:hover {
    background: #094066;
  }

  .copy-btn i.fa-check {
    color: #4caf50;
  }

  .share-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: #f0f7ff;
    border-radius: 6px;
    font-size: 13px;
    color: #555;
  }

  .share-info i {
    color: #0c5489;
  }

  .share-info strong {
    color: #333;
  }

  .share-btn {
    display: flex;
    align-items: center;
    gap: 6px;
  }


</style>
