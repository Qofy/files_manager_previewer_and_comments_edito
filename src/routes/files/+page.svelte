<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Auth } from '$lib/utils/auth.js';
  import { Api } from '$lib/utils/api.js';
  import { browser } from '$app/environment';
  import Aside from '$lib/components/Aside.svelte';
  import TopBar from '$lib/components/TopBar.svelte';
  import FilterBar from '$lib/components/FilterBar.svelte';
  import FileManager from '$lib/components/FileManager.svelte';
  import FileViewer from '$lib/components/FileViewer.svelte';
  import CommentSidebar from '$lib/components/CommentSidebar.svelte';

  // State
  let currentFolder = null;
  let allFiles = [];
  let folders = [];
  let filterType = 'all';
  let filterTag = 'all';
  let sortDir = 'desc';
  let searchQuery = '';
  let selected = new Set();
  let dragOverFolder = null;
  let mounted = false;
  let availableTags = [];
  
  // Viewer state
  let selectedFile = null;
  let commentText = '';
  let commentsState = [];
  let scope = 'private';
  let lastClickPos = null;
  let profileImage = null;
  let currentUsername = null;
  let showProfileMenu = false;
  let fileViewer;
  
  const _fileListCache = new Map();

  onMount(async () => {
    if (!Auth.token()) {
      goto('/login');
      return;
    }
    
    // Load user profile
    try {
      const token = Auth.token();
      const res = await fetch('/profile', {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (res.ok) {
        const profile = await res.json();
        profileImage = profile.profileImage;
        currentUsername = profile.username;
      } else if (res.status === 401 || res.status === 404) {
        // Unauthorized or user not found - clear auth and redirect
        Auth.clear();
        goto('/login');
        return;
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
    
    // Load available tags
    try {
      const token = Auth.token();
      const res = await fetch('/tags', {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (res.ok) {
        availableTags = await res.json();
      }
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
    
    mounted = true;
    await loadFolders();
    await loadFiles();
    
    // Restore selected file from localStorage after files are loaded
    if (browser) {
      const savedFileId = localStorage.getItem('selectedFileId');
      if (savedFileId) {
        setTimeout(() => {
          const file = allFiles.find(f => f.id === savedFileId);
          if (file) {
            handleView(file);
          } else {
            localStorage.removeItem('selectedFileId');
          }
        }, 500);
      }
    }
  });

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
    if (filterTag !== 'all') {
      params.append('tag', filterTag);
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
    
    if (browser) {
      localStorage.setItem('selectedFileId', file.id);
    }
    
    if (fileViewer) {
      await fileViewer.initViewer(file);
      await loadComments();
    }
  }
  
  function closeViewer() {
    selectedFile = null;
    commentsState = [];
    commentText = '';
    
    if (browser) {
      localStorage.removeItem('selectedFileId');
    }
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

  // Tag handlers
  async function handleAddTag(event) {
    const { itemId, itemType, tags } = event.detail;
    try {
      const token = Auth.token();
      const endpoint = itemType === 'file' ? `/files/${itemId}/tags` : `/folders/${itemId}/tags`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tags })
      });
      
      if (res.ok) {
        // Reload files and folders to show updated tags
        await loadFiles();
        await loadFolders();
      }
    } catch (err) {
      console.error('Failed to add tag:', err);
    }
  }

  async function handleRemoveTag(event) {
    const { itemId, itemType, tag } = event.detail;
    try {
      const token = Auth.token();
      const endpoint = itemType === 'file' ? `/files/${itemId}/tags?tag=${tag}` : `/folders/${itemId}/tags?tag=${tag}`;
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      
      if (res.ok) {
        await loadFiles();
        await loadFolders();
      }
    } catch (err) {
      console.error('Failed to remove tag:', err);
    }
  }

  // Profile menu handlers
  function handleProfileToggle(event) {
    showProfileMenu = event.detail.showMenu;
  }

  async function handleProfileUpload(event) {
    const base64Image = event.detail.image;
    try {
      const result = await Api('/profile', {
        method: 'PUT',
        body: { profileImage: base64Image }
      });
      profileImage = result.profileImage;
      showProfileMenu = false;
    } catch (err) {
      console.error('Failed to upload profile image:', err);
      alert('Failed to upload image');
    }
  }

  async function handleProfileRemove() {
    try {
      const result = await Api('/profile', {
        method: 'PUT',
        body: { profileImage: null }
      });
      profileImage = result.profileImage;
      showProfileMenu = false;
    } catch (err) {
      console.error('Failed to remove profile image:', err);
      alert('Failed to remove image');
    }
  }

  // Reactive filtered files
  $: filteredFiles = allFiles.sort((a, b) => {
    const da = new Date(a.uploaded_at || 0);
    const db = new Date(b.uploaded_at || 0);
    return sortDir === 'asc' ? da - db : db - da;
  });

  $: currentFolderObj = currentFolder ? folders.find(f => f.id === currentFolder) : null;
  $: subFolders = folders.filter(f => f.parent_id === currentFolder);

  // Watch for filter/search changes
  $: if (mounted && (filterType || filterTag || searchQuery !== undefined)) {
    loadFiles();
  }

  // Comments
  function handlePageClick(event) {
    lastClickPos = event.detail;
  }

  function handleScopeChange(event) {
    scope = event.detail.scope;
    loadComments();
  }

  function visiblePageOr(fallback = 1) {
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
        if (fileViewer) {
          fileViewer.renderCommentPins(commentsState);
        }
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }

  async function handleSendComment(event) {
    const text = event.detail.text;
    const highlightId = event.detail.highlightId; // Optional highlight link
    if (!text || !selectedFile) return;

    const token = Auth.token();
    const pos = lastClickPos || { page: visiblePageOr(1), x: 0.5, y: 0.3 };
    
    const payload = {
      file_id: selectedFile.id,
      page: pos.page,
      x: pos.x,
      y: pos.y,
      text: text,
      scope,
      highlightId, // Link to highlight if provided
    };

    const optimistic = {
      ...payload,
      id: 'tmp_' + Date.now(),
      user_id: 'me',
      created_at: new Date().toISOString(),
    };
    
    commentsState = [...commentsState, optimistic];
    commentText = '';
    if (fileViewer) {
      fileViewer.renderCommentPins(commentsState);
    }

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
      commentText = text;
    }
    
    if (fileViewer) {
      fileViewer.renderCommentPins(commentsState);
    }
  }

  function handlePdfLoaded() {
    loadComments();
  }

  function handlePagesRendered() {
    if (fileViewer) {
      fileViewer.renderCommentPins(commentsState);
    }
  }

  function handleHighlightCreated(event) {
    const { highlight } = event.detail;
    
    // Pre-fill comment text with the highlighted text
    commentText = `"${highlight.text}"\n\n`;
    
    // Set click position to the highlight position
    lastClickPos = {
      page: highlight.page,
      x: highlight.x,
      y: highlight.y
    };
    
    // Optionally auto-send a comment or let user edit it
    // For now, just pre-fill the comment box so user can add their thoughts
  }

  function handleHighlightClick(event) {
    const { highlight } = event.detail;
    
    // Find and scroll to the comment associated with this highlight
    const relatedComment = commentsState.find(c => c.highlightId === highlight.id);
    
    if (relatedComment) {
      // Scroll to the comment in the sidebar
      // You could add a highlight effect or focus the comment
      console.log('Related comment:', relatedComment);
    } else {
      // No comment yet, pre-fill with highlight text
      commentText = `"${highlight.text}"\n\n`;
      lastClickPos = {
        page: highlight.page,
        x: highlight.x,
        y: highlight.y
      };
    }
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
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
</svelte:head>

<div class="app-container">
  <Aside/>
  
  <main class="main-content">
    <div class="sidebar">
      <TopBar 
        bind:searchQuery
        bind:profileImage
        bind:showProfileMenu
        on:profileToggle={handleProfileToggle}
        on:profileUpload={handleProfileUpload}
        on:profileRemove={handleProfileRemove}
        on:logout={handleLogout}
      />
      
      <FilterBar 
        bind:filterType
        bind:filterTag
        bind:sortDir
        {availableTags}
      />
      
      <FileManager 
        {filteredFiles}
        {subFolders}
        {currentFolderObj}
        {selected}
        {dragOverFolder}
        {availableTags}
        {searchQuery}
        {filterType}
        on:createFolder={handleCreateFolder}
        on:upload={() => document.getElementById('file-input').click()}
        on:navigateToFolder={(e) => navigateToFolder(e.detail.folderId)}
        on:navigateToAll={navigateToAll}
        on:navigateToParent={navigateToParent}
        on:viewFile={(e) => handleView(e.detail.file)}
        on:deleteFile={(e) => handleDelete(e.detail.fileId, e.detail.fileName)}
        on:toggleSelection={(e) => toggleSelection(e.detail.fileId)}
        on:dragStart={(e) => handleDragStart(e.detail.event, e.detail.file)}
        on:dragOver={(e) => handleDragOver(e.detail.event, e.detail.folderId)}
        on:dragLeave={(e) => handleDragLeave(e.detail.folderId)}
        on:drop={(e) => handleDrop(e.detail.event, e.detail.targetFolderId)}
        on:addTag={handleAddTag}
        on:removeTag={handleRemoveTag}
      />
      
      <input
        id="file-input"
        type="file"
        multiple
        style="display: none"
        on:change={handleUpload}
      />
    </div>
    
    <FileViewer 
      bind:this={fileViewer}
      {selectedFile}
      bind:scope
      on:close={closeViewer}
      on:pageClick={handlePageClick}
      on:scopeChange={handleScopeChange}
      on:pdfLoaded={handlePdfLoaded}
      on:pagesRendered={handlePagesRendered}
      on:highlightCreated={handleHighlightCreated}
      on:highlightClick={handleHighlightClick}
    />
    
    <CommentSidebar 
      {commentsState}
      bind:commentText
      {selectedFile}
      {profileImage}
      {currentUsername}
      on:sendComment={handleSendComment}
    />
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
    max-height: 100vh;
    overflow: hidden;
  }

  .main-content {
    flex: 1;
    display: flex;
    overflow: hidden;
    height: 100vh;
  }

  .sidebar {
    width: 35%;
    background: #fff;
    border-right: 1px solid #e0e0e0;
    display: flex;
    flex-direction: column;
    padding: 20px 10px;
    overflow-y: auto;
    flex-shrink: 0;
    height: 100%;
  }
</style>
