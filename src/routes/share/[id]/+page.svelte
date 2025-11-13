<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import FileViewer from '$lib/components/FileViewer.svelte';
  import CommentSidebar from '$lib/components/CommentSidebar.svelte';

  let fileViewer;
  let selectedFile = null;
  let commentsState = [];
  let scope = 'public';
  let loading = true;
  let error = null;
  let lastClickPos = null;
  let commentText = '';
  
  // Read-only mode for shared files
  const isReadOnly = true;

  onMount(async () => {
    if (!browser) return;

    const fileId = $page.params.id;
    
    if (!fileId) {
      error = 'Invalid file ID';
      loading = false;
      return;
    }

    try {
      // Load file metadata
      const fileResponse = await fetch(`/files/${fileId}`);
      
      if (!fileResponse.ok) {
        throw new Error('File not found');
      }
      
      selectedFile = await fileResponse.json();
      
      // Load public comments
      await loadComments();
      
      // Initialize viewer
      if (fileViewer && selectedFile) {
        await fileViewer.initViewer(selectedFile);
      }
      
      loading = false;
    } catch (err) {
      console.error('Error loading shared file:', err);
      error = err.message || 'Failed to load file';
      loading = false;
    }
  });

  async function loadComments() {
    if (!selectedFile) return;
    
    try {
      const response = await fetch(`/pdf/${selectedFile.id}/comments?scope=public`);
      
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

  function handlePageClick(event) {
    const { page: pageNum, x, y } = event.detail;
    lastClickPos = { page: pageNum, x, y };
  }

  function handlePdfLoaded() {
    loadComments();
  }

  function handlePagesRendered() {
    if (fileViewer) {
      fileViewer.renderCommentPins(commentsState);
    }
  }

  function handleScopeChange() {
    loadComments();
  }
</script>

<svelte:head>
  <title>Shared File - {selectedFile?.name || 'Loading...'}</title>
  <link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
    crossorigin="anonymous"
    referrerpolicy="no-referrer"
  />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
</svelte:head>

<div class="share-container">
  {#if loading}
    <div class="loading-screen">
      <div class="spinner"></div>
      <p>Loading shared file...</p>
    </div>
  {:else if error}
    <div class="error-screen">
      <i class="fas fa-exclamation-triangle"></i>
      <h2>File Not Found</h2>
      <p>{error}</p>
      <a href="/" class="back-link">Go to Homepage</a>
    </div>
  {:else}
    <header class="share-header">
      <div class="share-info">
        <i class="fas fa-share-alt"></i>
        <div>
          <h1>{selectedFile?.name}</h1>
          <p>Shared file • View only</p>
        </div>
      </div>
      <a href="/" class="home-btn">
        <i class="fas fa-home"></i> Go to App
      </a>
    </header>

    <main class="share-main">
      <FileViewer 
        bind:this={fileViewer}
        {selectedFile}
        bind:scope
        on:pageClick={handlePageClick}
        on:scopeChange={handleScopeChange}
        on:pdfLoaded={handlePdfLoaded}
        on:pagesRendered={handlePagesRendered}
      />
      
      <CommentSidebar 
        {commentsState}
        bind:commentText
        {selectedFile}
        profileImage=""
        currentUsername="Viewer"
        readOnly={true}
      />
    </main>
  {/if}
</div>

<style>
  .share-container {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: #f6f8fa;
  }

  .loading-screen,
  .error-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    gap: 20px;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #f0f0f0;
    border-top: 4px solid #0c5489;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .loading-screen p {
    font-size: 16px;
    color: #666;
  }

  .error-screen i {
    font-size: 64px;
    color: #e53935;
  }

  .error-screen h2 {
    margin: 0;
    font-size: 24px;
    color: #333;
  }

  .error-screen p {
    margin: 8px 0 24px 0;
    font-size: 16px;
    color: #666;
  }

  .back-link {
    padding: 10px 20px;
    background: #0c5489;
    color: white;
    text-decoration: none;
    border-radius: 6px;
    font-size: 14px;
  }

  .back-link:hover {
    background: #094066;
  }

  .share-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    background: white;
    border-bottom: 1px solid #e0e0e0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .share-info {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .share-info > i {
    font-size: 32px;
    color: #0c5489;
  }

  .share-info h1 {
    margin: 0;
    font-size: 20px;
    color: #333;
    font-weight: 600;
  }

  .share-info p {
    margin: 4px 0 0 0;
    font-size: 13px;
    color: #888;
  }

  .home-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: #f0f0f0;
    color: #333;
    text-decoration: none;
    border-radius: 6px;
    font-size: 14px;
    transition: background 0.2s;
  }

  .home-btn:hover {
    background: #e0e0e0;
  }

  .share-main {
    flex: 1;
    display: flex;
    overflow: hidden;
  }
</style>
