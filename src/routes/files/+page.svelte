<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Auth } from '$lib/utils/auth.js';
  import { browser } from '$app/environment';
	import Aside from '$lib/pages/Aside.svelte';

  // State
  let currentFolder = null;
  let allFiles = [];
  let folders = [];
  let filterType = 'all';
  let sortDir = 'desc';
  let searchQuery = '';
  let selected = new Set();
  let dragOverFolder = null;
  let mounted = false;
  
  // Viewer state
  let selectedFile = null;
  let pagesEl;
  let viewerEl;
  let commentText = '';
  let commentsState = [];
  let zoomLevel = 1.0;
  let scope = 'private';
  let lastClickPos = null;
  let pdf = null;
  let fileExt = '';
  let dimLabel = '';
  let renderTasks = new Map();
  
  const _fileListCache = new Map();
  
  $: zoomPercent = Math.round(zoomLevel * 100);

  onMount(async () => {
    if (!Auth.token()) {
      goto('/login');
      return;
    }
    
    mounted = true;
    await loadFolders();
    await loadFiles();
  });

  // Format bytes
  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const val = bytes / Math.pow(1024, i);
    return val.toFixed(2) + ' ' + sizes[i];
  }

  // Load folders
  async function loadFolders() {
    try {
      const token = Auth.token();
      const res = await fetch('/folders', { 
        headers: { Authorization: 'Bearer ' + token } 
      });
      if (!res.ok) throw new Error('Failed to fetch folders');
      const data = await res.json();
      folders = data.folders || [];
    } catch (err) {
      console.error(err);
      folders = [];
    }
  }

  // Load files
  async function loadFiles() {
    let url = '/files';
    const params = new URLSearchParams();
    
    if (currentFolder) {
      params.append('folder_id', currentFolder);
    }
    if (filterType !== 'all') {
      params.append('category', filterType);
    }
    if (searchQuery) {
      params.append('search', searchQuery);
    }
    
    if (params.toString()) {
      url += '?' + params.toString();
    }
    
    try {
      const token = Auth.token();
      const res = await fetch(url, {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!res.ok) throw new Error('Failed to fetch files');
      const data = await res.json();
      allFiles = data.files || [];
    } catch (err) {
      console.error(err);
      allFiles = [];
    }
  }

  // Reload with current filters
  async function reloadFiles() {
    _fileListCache.clear();
    await loadFiles();
    await loadFolders();
  }

  // Create folder
  async function handleCreateFolder() {
    const name = prompt('Enter new folder name:');
    if (!name || !name.trim()) return;

    try {
      const token = Auth.token();
      const res = await fetch('/folders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: 'Bearer ' + token 
        },
        body: JSON.stringify({ 
          name: name.trim(),
          parent_id: currentFolder 
        })
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create folder');
      }
      
      await reloadFiles();
    } catch (e) { 
      alert('Could not create folder: ' + e.message); 
    }
  }

  // Upload files
  async function handleUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const token = Auth.token();
    
    for (const file of files) {
      const form = new FormData();
      form.append('file', file);
      if (currentFolder) {
        form.append('folder_id', currentFolder);
      }
      
      try {
        const res = await fetch('/files', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token },
          body: form
        });
        if (!res.ok) {
          const error = await res.json();
          alert('Failed to upload ' + file.name + ': ' + (error.error || 'Unknown error'));
        }
      } catch (err) {
        alert('Error uploading file ' + file.name + ': ' + err.message);
      }
    }
    
    event.target.value = '';
    await reloadFiles();
  }

  // Delete file
  async function handleDelete(fileId, fileName) {
    if (!confirm('Are you sure you want to delete "' + fileName + '"?')) return;
    
    try {
      const token = Auth.token();
      const res = await fetch('/files/' + fileId, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token }
      });
      if (res.ok) {
        await reloadFiles();
      } else {
        const error = await res.json();
        alert('Failed to delete file: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error deleting file: ' + err.message);
    }
  }

  // View file
  async function handleView(file) {
    selectedFile = file;
    fileExt = file.type.toLowerCase();
    
    if (!browser) return;

    // Wait for PDF.js to load if needed
    if (fileExt === 'pdf') {
      let attempts = 0;
      while (!window.pdfjsLib && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
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
  
  function closeViewer() {
    selectedFile = null;
    pdf = null;
    if (pagesEl) pagesEl.innerHTML = '';
    commentsState = [];
    commentText = '';
    dimLabel = '';
  }

  // Navigate to folder
  function navigateToFolder(folderId) {
    currentFolder = folderId;
    reloadFiles();
  }

  // Go back to all files
  function navigateToAll() {
    currentFolder = null;
    reloadFiles();
  }

  // Go to parent folder
  function navigateToParent() {
    const folder = folders.find(f => f.id === currentFolder);
    if (folder && folder.parent_id) {
      currentFolder = folder.parent_id;
    } else {
      currentFolder = null;
    }
    reloadFiles();
  }

  // Drag and drop handlers
  function handleDragStart(event, file) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', file.id);
    selected.add(file.id);
    selected = selected;
  }

  function handleDragOver(event, folderId) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    dragOverFolder = folderId;
  }

  function handleDragLeave(folderId) {
    if (dragOverFolder === folderId) {
      dragOverFolder = null;
    }
  }

  async function handleDrop(event, targetFolderId) {
    event.preventDefault();
    dragOverFolder = null;

    const fileIds = Array.from(selected);
    if (fileIds.length === 0) return;

    try {
      const token = Auth.token();
      const res = await fetch('/files/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({
          file_ids: fileIds,
          target_folder_id: targetFolderId
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to move files');
      }

      selected.clear();
      selected = selected;
      await reloadFiles();
    } catch (err) {
      alert('Error moving files: ' + err.message);
    }
  }

  // Toggle selection
  function toggleSelection(fileId) {
    if (selected.has(fileId)) {
      selected.delete(fileId);
    } else {
      selected.add(fileId);
    }
    selected = selected;
  }

  function handleLogout() {
    Auth.clear();
    goto('/login');
  }

  // Reactive filtered files
  $: filteredFiles = allFiles.sort((a, b) => {
    const da = new Date(a.uploaded_at || 0);
    const db = new Date(b.uploaded_at || 0);
    return sortDir === 'asc' ? da - db : db - da;
  });

  // Get current folder object
  $: currentFolderObj = currentFolder ? folders.find(f => f.id === currentFolder) : null;

  // Get subfolders in current location
  $: subFolders = folders.filter(f => f.parent_id === currentFolder);

  // Get file icon class
  function getFileIcon(category) {
    const icons = {
      documents: 'fas fa-file-pdf',
      images: 'fas fa-file-image',
      videos: 'fas fa-file-video',
      audio: 'fas fa-file-audio',
      other: 'fas fa-file'
    };
    return icons[category] || 'fas fa-file';
  }

  // Can preview check
  function canPreview(type) {
    return ['pdf','png','jpg','jpeg','gif','webp','mp4','webm','mp3','wav','txt','md','json'].includes(type.toLowerCase());
  }

  // Watch for filter/search changes (only after mount)
  $: if (mounted && (filterType || searchQuery !== undefined)) {
    loadFiles();
  }
  
  // ========== VIEWER FUNCTIONS ==========
  
  // PDF Viewer
  async function initPdfViewer(fileId) {
    if (!window.pdfjsLib) {
      alert('Failed to load PDF.js library');
      return;
    }

    const pdfjsLib = window.pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const token = Auth.token();

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
      
      // Fit to width
      const vw = viewerEl?.clientWidth || 800;
      const scale = Math.min(4, Math.max(0.2, (vw - 32) / w));
      zoomLevel = scale;
      img.style.transform = `scale(${scale})`;
    };
    
    img.src = url;
  }

  // Video Viewer
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

  // Audio Viewer
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

  // Text Viewer
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
    if (!selectedFile) return;
    
    const token = Auth.token();
    
    try {
      const response = await fetch(`/pdf/${selectedFile.id}/comments?scope=${scope}`, {
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
    if (!commentText.trim() || !selectedFile) {
      return;
    }

    const token = Auth.token();
    const pos = lastClickPos || { page: visiblePageOr(1), x: 0.5, y: 0.3 };
    
    const payload = {
      file_id: selectedFile.id,
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
      const response = await fetch(`/pdf/${selectedFile.id}/comments`, {
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
  <title>Files</title>
  <link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
    crossorigin="anonymous"
    referrerpolicy="no-referrer"
  />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
</svelte:head>

<div class="app-container">
  <!-- Sidebar -->
	 <Aside/>
  <!-- Main content -->
  <main class="main-content">
		<div class="sidebar">
			<!-- Top bar -->
			<div class="top-bar">
				<div class="search-container">
					<i class="fas fa-search"></i>
					<input type="text" placeholder="Search for or jump to" bind:value={searchQuery} />
				</div>
				<div class="actions">
					<i class="fas fa-bell"></i>
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<!-- svelte-ignore a11y-no-static-element-interactions -->
					<div class="profile" on:click={handleLogout}></div>
				</div>
			</div>
	
			<!-- Filters -->
			<div class="recent-section">
				<div class="recent-header">
					<h3>Recent activity</h3>
					<div class="filters">
						<label>
							<span>Type</span>
							<select bind:value={filterType}>
								<option value="all">All</option>
								<option value="pdf">PDF</option>
								<option value="image">Images</option>
								<option value="text">Text</option>
								<option value="audio">Audio</option>
								<option value="video">Video</option>
								<option value="archive">Archives</option>
								<option value="other">Other</option>
							</select>
						</label>
						<label>
							<span>Date</span>
							<select bind:value={sortDir}>
								<option value="desc">Newest first</option>
								<option value="asc">Oldest first</option>
							</select>
						</label>
					</div>
				</div>
			</div>
	
			<!-- File manager -->
			<div class="file-manager">
				<div class="file-header">
					<div class="breadcrumb">
						{#if currentFolderObj}
							<!-- svelte-ignore a11y-click-events-have-key-events -->
							<!-- svelte-ignore a11y-no-static-element-interactions -->
							<!-- svelte-ignore a11y-missing-attribute -->
							<a on:click={navigateToAll}>All</a>
							{#if currentFolderObj.parent_id}
								&gt; <a on:click={navigateToParent}>...</a>
							{/if}
							&gt; {currentFolderObj.name}
						{:else}
							All Files
						{/if}
					</div>
					<div class="file-actions">
						<button on:click={handleCreateFolder} title="New Folder">
							<i class="fas fa-folder-plus"></i>
						</button>
						<button on:click={() => document.getElementById('file-input').click()} title="Upload Files">
							<i class="fas fa-upload"></i>
						</button>
						<input
							id="file-input"
							type="file"
							multiple
							style="display: none"
							on:change={handleUpload}
						/>
					</div>
				</div>
	
				<!-- Folders section -->
				{#if subFolders.length > 0}
					<div class="folders-grid">
						{#each subFolders as folder}
							<!-- svelte-ignore a11y-click-events-have-key-events -->
							<!-- svelte-ignore a11y-no-static-element-interactions -->
							<div 
								class="folder-card" 
								class:drag-over={dragOverFolder === folder.id}
								on:click={() => navigateToFolder(folder.id)}
								on:dragover={(e) => handleDragOver(e, folder.id)}
								on:dragleave={() => handleDragLeave(folder.id)}
								on:drop={(e) => handleDrop(e, folder.id)}
							>
								<i class="fas fa-folder"></i>
								<span>{folder.name}</span>
							</div>
						{/each}
					</div>
				{/if}
	
				<table class="file-table">
					<thead>
						<tr>
							<th style="width: 40px"></th>
							<th>Name</th>
							<th>Size</th>
							<th>Type</th>
							<th>Date</th>
							<th style="text-align: right">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#if filteredFiles.length === 0}
							<tr>
								<td colspan="6" style="padding:40px;color:#888;text-align:center;">
									{#if searchQuery}
										No files match your search
									{:else if filterType !== 'all'}
										No {filterType} files
									{:else}
										No files in this folder. Upload some files to get started.
									{/if}
								</td>
							</tr>
						{:else}
							{#each filteredFiles as file}
								<tr 
									class="file-row" 
									class:selected={selected.has(file.id)}
									draggable="true"
									on:dragstart={(e) => handleDragStart(e, file)}
								>
									<td>
										<input 
											type="checkbox" 
											checked={selected.has(file.id)}
											on:change={() => toggleSelection(file.id)}
										/>
									</td>
									<td class="file-name">
										<i class={getFileIcon(file.category)}></i>
										<span>{file.name}</span>
									</td>
									<td>{formatBytes(file.size)}</td>
									<td>{file.type.toUpperCase()}</td>
									<td>{new Date(file.uploaded_at).toLocaleDateString()}</td>
									<td style="text-align: right">
										{#if canPreview(file.type)}
											<button class="icon-btn" on:click={() => handleView(file)} title="View">
												<i class="fas fa-eye"></i>
											</button>
										{/if}
										<button class="icon-btn" on:click={() => window.open('/files/' + file.id, '_blank')} title="Download">
											<i class="fas fa-download"></i>
										</button>
										<button class="icon-btn" on:click={() => handleDelete(file.id, file.name)} title="Delete">
											<i class="fas fa-trash"></i>
										</button>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>

		</div>

		<div class="view-comment-container" class:visible={selectedFile}>
			{#if selectedFile}
				<div class="viewer-wrapper">
					<aside class="comment-sidebar">
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
							<button on:click={closeViewer} class="close-btn">
								<i class="fas fa-times"></i> Close
							</button>
						</div>
						<!-- svelte-ignore a11y-click-events-have-key-events -->
						<!-- svelte-ignore a11y-no-static-element-interactions -->
						<div bind:this={pagesEl} on:click={handlePageClick} id="pages"></div>
					</main>
				</div>
			{/if}
		</div>


  </main>
</div>

<style>
  * { box-sizing: border-box; }
  
  :global(body) {
    margin: 0;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
    background: #f9f9f9;
    color: #333;
  }

  .app-container {
    display: flex;
    min-height: 100vh;
  }

  /* .sidebar {
    width: 60px;
    background: #fff;
    border-right: 1px solid #e0e0e0;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 10px;
  } */
  .main-content {
    flex: 1;
    padding: 20px 30px;
    overflow-y: auto;
    display: flex;
    gap: 20px;
  }
  
  .sidebar {
    flex: 1;
    min-width: 0;
  }

  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .search-container {
    flex: 1;
    position: relative;
    margin-right: 20px;
    max-width: 500px;
  }

  .search-container input {
    width: 100%;
    padding: 8px 12px 8px 32px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #fff;
  }

  .search-container i {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: #888;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .actions i {
    font-size: 18px;
    color: #0c5489;
    cursor: pointer;
  }

  .profile {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #0c5489;
    cursor: pointer;
  }

  .recent-section {
    margin-bottom: 20px;
  }

  .recent-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 15px;
  }

  .recent-header h3 {
    margin: 0;
    color: #0c5489;
    font-weight: 600;
  }

  .filters {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .filters label {
    display: flex;
    gap: 6px;
    align-items: center;
    color: #0c5489;
    font-weight: 600;
    font-size: 14px;
  }

  .filters select {
    padding: 6px 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #fff;
    color: #333;
  }

  .file-manager {
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
  }

  .file-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 15px;
    border-bottom: 1px solid #f0f0f0;
    background: #fafafa;
  }

  .breadcrumb {
    font-size: 14px;
    color: #0c5489;
    font-weight: 600;
  }

  .breadcrumb a {
    color: #0c5489;
    text-decoration: none;
    cursor: pointer;
  }

  .breadcrumb a:hover {
    text-decoration: underline;
  }

  .file-actions {
    display: flex;
    gap: 8px;
  }

  .file-actions button {
    padding: 6px 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #fff;
    cursor: pointer;
    color: #0c5489;
  }

  .file-actions button:hover {
    background: #f5faff;
  }

  .folders-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
    padding: 15px;
    border-bottom: 1px solid #f0f0f0;
  }

  .folder-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    background: #fafafa;
  }

  .folder-card:hover {
    background: #f0f6fa;
    border-color: #0c5489;
  }

  .folder-card.drag-over {
    background: #e6f3ff;
    border-color: #0c5489;
    border-style: dashed;
  }

  .folder-card i {
    font-size: 32px;
    color: #0c5489;
    margin-bottom: 8px;
  }

  .folder-card span {
    font-size: 13px;
    color: #333;
    text-align: center;
    word-break: break-word;
  }

  .file-table {
    width: 100%;
    border-collapse: collapse;
  }

  .file-table thead th {
    text-align: left;
    padding: 8px 12px;
    background: #f7f9fb;
    border-bottom: 1px solid #f0f0f0;
    font-size: 14px;
    color: #555;
    font-weight: 600;
  }

  .file-table tbody td {
    padding: 10px 12px;
    border-bottom: 1px solid #f0f0f0;
    font-size: 14px;
  }

  .file-row {
    cursor: pointer;
  }

  .file-row:hover {
    background: #f5faff;
  }

  .file-row.selected {
    background: #e6f3ff;
  }

  .file-name {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .file-name i {
    font-size: 18px;
    color: #0c5489;
  }

  .icon-btn {
    border: none;
    background: transparent;
    cursor: pointer;
    padding: 4px 8px;
    color: #0c5489;
  }

  .icon-btn:hover {
    background: #f0f6fa;
    border-radius: 4px;
  }
  
  /* ========== VIEWER STYLES ========== */
  
  .view-comment-container {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #fff;
    z-index: 1000;
  }
  
  .view-comment-container.visible {
    display: block;
  }
  
  .viewer-wrapper {
    display: flex;
    height: 100vh;
    font-family: system-ui;
  }
  
  .comment-sidebar {
    width: 320px;
    border-right: 1px solid #eee;
    display: flex;
    flex-direction: column;
    background: #fff;
  }
  
  .comment-sidebar header {
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

  .close-btn {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  #pages {
    padding: 16px;
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
