<script>
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
  
  $: fileId = $page.params.id;
  $: zoomPercent = Math.round(zoomLevel * 100);

  onMount(async () => {
    if (!browser) return;

    const token = localStorage.getItem('token');
    
    if (!fileId) {
      goto('/files');
      return;
    }

    // Load PDF.js
    const pdfjsLib = window.pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    try {
      // Load PDF
      const loadingTask = pdfjsLib.getDocument({
        url: `/files/${encodeURIComponent(fileId)}`,
        httpHeaders: token ? { Authorization: 'Bearer ' + token } : {},
      });
      
      pdf = await loadingTask.promise;
      await renderAllPages();
      await loadComments();
    } catch (error) {
      console.error('Error loading PDF:', error);
      alert('Failed to load PDF');
    }
  });

  async function renderAllPages() {
    if (!pdf || !pagesEl) return;
    
    pagesEl.innerHTML = '';
    const tasks = [];
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      tasks.push(renderPage(pageNum));
    }
    
    await Promise.all(tasks);
    renderCommentPins();
  }

  async function renderPage(pageNumber) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: zoomLevel });
    
    const container = document.createElement('div');
    container.className = 'page';
    container.dataset.page = pageNumber;
    container.style.width = viewport.width + 'px';
    container.style.height = viewport.height + 'px';
    
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    container.appendChild(canvas);
    pagesEl.appendChild(container);
    
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    
    return container;
  }

  function handlePageClick(event) {
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

  function zoomIn() {
    zoomLevel = Math.min(3, Math.round((zoomLevel + 0.1) * 10) / 10);
    renderAllPages();
  }

  function zoomOut() {
    zoomLevel = Math.max(0.5, Math.round((zoomLevel - 0.1) * 10) / 10);
    renderAllPages();
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
    if (!lastClickPos || !commentText.trim()) {
      alert('Please click a spot in the PDF first and enter a comment');
      return;
    }

    const token = localStorage.getItem('token');
    const payload = {
      file_id: fileId,
      page: lastClickPos.page,
      x: lastClickPos.x,
      y: lastClickPos.y,
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
    document.querySelectorAll('.pin').forEach(pin => pin.remove());
    
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
</script>

<svelte:head>
  <title>File Manager</title>
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
      <button on:click={handleSendComment}>Send</button>
    </div>
  </aside>
  
  <main class="viewer" bind:this={viewerEl}>
    <div class="toolbar">
      <button on:click={zoomOut}>-</button>
      <span>{zoomPercent}%</span>
      <button on:click={zoomIn}>+</button>
      <label class="scope-toggle">
        <select bind:value={scope} on:change={handleScopeChange}>
          <option value="private">My team (private)</option>
          <option value="public">Public</option>
        </select>
      </label>
    </div>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
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
  }
  
  .sidebar header {
    padding: 12px 16px;
    border-bottom: 1px solid #eee;
    font-weight: 600;
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
  }
  
  .scope-toggle {
    margin-left: auto;
  }
  
  button {
    cursor: pointer;
  }
</style>
