<script>
  import { createEventDispatcher } from 'svelte';
  import TagPill from './TagPill.svelte';
  import TagSelector from './TagSelector.svelte';

  export let filteredFiles = [];
  export let subFolders = [];
  export let currentFolderObj = null;
  export let selected = new Set();
  export let dragOverFolder = null;
  export let availableTags = [];
  export let searchQuery = '';
  export let filterType = 'all';

  const dispatch = createEventDispatcher();

  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const val = bytes / Math.pow(1024, i);
    return val.toFixed(2) + ' ' + sizes[i];
  }

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

  function canPreview(type) {
    return ['pdf','png','jpg','jpeg','gif','webp','mp4','webm','mp3','wav','txt','md','json'].includes(type.toLowerCase());
  }

  function getTagColor(tagId) {
    const tag = availableTags.find(t => t.id === tagId);
    return tag ? tag.color : '#5f6368';
  }

  function getTagName(tagId) {
    const tag = availableTags.find(t => t.id === tagId);
    return tag ? tag.name : tagId;
  }

  function handleCreateFolder() {
    dispatch('createFolder');
  }

  function handleUpload() {
    dispatch('upload');
  }

  function navigateToFolder(folderId) {
    dispatch('navigateToFolder', { folderId });
  }

  function navigateToAll() {
    dispatch('navigateToAll');
  }

  function navigateToParent() {
    dispatch('navigateToParent');
  }

  function handleView(file) {
    dispatch('viewFile', { file });
  }

  function handleDelete(fileId, fileName) {
    dispatch('deleteFile', { fileId, fileName });
  }

  function toggleSelection(fileId) {
    dispatch('toggleSelection', { fileId });
  }

  function handleDragStart(event, file) {
    dispatch('dragStart', { event, file });
  }

  function handleDragOver(event, folderId) {
    dispatch('dragOver', { event, folderId });
  }

  function handleDragLeave(folderId) {
    dispatch('dragLeave', { folderId });
  }

  function handleDrop(event, targetFolderId) {
    dispatch('drop', { event, targetFolderId });
  }

  function handleAddTag(event) {
    dispatch('addTag', event.detail);
  }

  function handleRemoveTag(event) {
    dispatch('removeTag', event.detail);
  }
</script>

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
      <button on:click={handleUpload} title="Upload Files">
        <i class="fas fa-upload"></i>
      </button>
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
          on:dragover={(e) => handleDragOver(e, folder.id)}
          on:dragleave={() => handleDragLeave(folder.id)}
          on:drop={(e) => handleDrop(e, folder.id)}
        >
          <div class="folder-content" on:click={() => navigateToFolder(folder.id)}>
            <i class="fas fa-folder"></i>
            <span>{folder.name}</span>
          </div>
          <div class="folder-tags" on:click|stopPropagation>
            {#if folder.tags && folder.tags.length > 0}
              {#each folder.tags as tagId}
                <TagPill tag={getTagName(tagId)} color={getTagColor(tagId)} />
              {/each}
            {/if}
            <TagSelector
              itemId={folder.id}
              itemType="folder"
              currentTags={folder.tags || []}
              {availableTags}
              on:add={handleAddTag}
              on:remove={handleRemoveTag}
            />
          </div>
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
        <th>Tags</th>
        <th>Date</th>
        <th style="text-align: right">Actions</th>
      </tr>
    </thead>
    <tbody>
      {#if filteredFiles.length === 0}
        <tr>
          <td colspan="7" style="padding:40px;color:#888;text-align:center;">
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
            <td on:click|stopPropagation>
              <input 
                type="checkbox" 
                checked={selected.has(file.id)}
                on:change={() => toggleSelection(file.id)}
              />
            </td>
            <td class="file-name" on:click={() => handleView(file)}>
              <i class={getFileIcon(file.category)}></i>
              <span>{file.name}</span>
            </td>
            <td on:click={() => handleView(file)}>{formatBytes(file.size)}</td>
            <td on:click={() => handleView(file)}>{file.type.toUpperCase()}</td>
            <td on:click|stopPropagation>
              <div class="tags-cell">
                {#if file.tags && file.tags.length > 0}
                  {#each file.tags as tagId}
                    <TagPill tag={getTagName(tagId)} color={getTagColor(tagId)} />
                  {/each}
                {/if}
                <TagSelector
                  itemId={file.id}
                  itemType="file"
                  currentTags={file.tags || []}
                  {availableTags}
                  on:add={handleAddTag}
                  on:remove={handleRemoveTag}
                />
              </div>
            </td>
            <td on:click={() => handleView(file)}>{new Date(file.uploaded_at).toLocaleDateString()}</td>
            <td style="text-align: right" on:click|stopPropagation>
              {#if canPreview(file.type)}
                <button class="icon-btn" on:click|stopPropagation={() => handleView(file)} title="View">
                  <i class="fas fa-eye"></i>
                </button>
              {/if}
              <button class="icon-btn" on:click|stopPropagation={() => window.open('/files/' + file.id, '_blank')} title="Download">
                <i class="fas fa-download"></i>
              </button>
              <button class="icon-btn" on:click|stopPropagation={(e) => { e.preventDefault(); handleDelete(file.id, file.name); }} title="Delete">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
</div>

<style>
  .file-manager {
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    width: 100%;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .file-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 15px;
    border-bottom: 1px solid #f0f0f0;
    background: #fafafa;
    flex-shrink: 0;
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
    align-items: flex-start;
    justify-content: space-between;
    padding: 16px;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    transition: all 0.2s;
    background: #fafafa;
    gap: 12px;
    min-height: 100px;
  }

  .folder-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    cursor: pointer;
    flex: 1;
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

  .folder-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
    width: 100%;
    min-height: 24px;
  }

  .tags-cell {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
    padding: 4px 0;
  }

  .file-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: auto;
    display: block;
    overflow-y: auto;
    flex: 1;
  }
  
  .file-table thead,
  .file-table tbody {
    display: table;
    width: 100%;
    table-layout: fixed;
  }
  
  .file-table thead {
    position: sticky;
    top: 0;
    z-index: 1;
    background: #f7f9fb;
  }

  .file-table thead th {
    text-align: left;
    padding: 8px 14px;
    background: #f7f9fb;
    border-bottom: 1px solid #f0f0f0;
    font-size: 14px;
    color: #555;
    font-weight: 600;
  }

  .file-table tbody td {
    border-bottom: 1px solid #f0f0f0;
    font-size: 14px;
    white-space: nowrap;
  }
  
  .file-table tbody td:last-child {
    text-align: right;
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
    max-width: 100px;
    overflow: hidden;
  }
  
  .file-name span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-name i {
    font-size: 18px;
    color: #0c5489;
    flex-shrink: 0;
  }

  .icon-btn {
    border: none;
    background: transparent;
    cursor: pointer;
    padding: 4px 8px;
    color: #0c5489;
    font-size: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    min-height: 28px;
  }
  
  .icon-btn i {
    pointer-events: none;
  }

  .icon-btn:hover {
    background: #f0f6fa;
    border-radius: 4px;
  }
</style>
