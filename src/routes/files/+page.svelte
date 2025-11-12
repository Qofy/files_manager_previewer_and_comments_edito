<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Auth } from '$lib/utils/auth.js';

  // State
  let currentFolder = null;
  let allFiles = [];
  let folders = [];
  let filterType = 'all';
  let sortDir = 'desc';
  let searchQuery = '';
  let selected = new Set();
  let dragOverFolder = null;
  
  const _fileListCache = new Map();

  onMount(async () => {
    if (!Auth.token()) {
      goto('/login');
      return;
    }
    
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
  function handleView(file) {
    goto(`/files/${file.id}`);
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

  // Watch for filter/search changes
  $: if (filterType || searchQuery !== undefined) {
    loadFiles();
  }
</script>

<svelte:head>
  <title>Files</title>
  <link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
    crossorigin="anonymous"
    referrerpolicy="no-referrer"
  />
</svelte:head>

<div class="app-container">
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="logo"></div>
    <ul class="nav">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <li on:click={() => goto('/dashboard')}><i class="fas fa-chart-line"></i></li>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <li on:click={() => goto('/invoices')}><i class="fas fa-file-invoice"></i></li>
      <li class="active"><i class="fas fa-folder"></i></li>
      <li><i class="fas fa-user-friends"></i></li>
      <li><i class="fas fa-user-circle"></i></li>
      <li><i class="fas fa-cog"></i></li>
    </ul>
  </aside>

  <!-- Main content -->
  <main class="main-content">
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

  .sidebar {
    width: 60px;
    background: #fff;
    border-right: 1px solid #e0e0e0;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 10px;
  }

  .sidebar .logo {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #0c5489;
    margin-bottom: 20px;
  }

  .sidebar ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .sidebar ul li {
    margin: 15px 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    color: #0c5489;
    cursor: pointer;
    transition: background 0.2s;
  }

  .sidebar ul li:hover,
  .sidebar ul li.active {
    background: #f0f6fa;
  }

  .main-content {
    flex: 1;
    padding: 20px 30px;
    overflow-y: auto;
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
</style>
