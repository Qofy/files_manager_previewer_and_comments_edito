<script>
  import { createEventDispatcher } from 'svelte';
  import ProfileMenu from './ProfileMenu.svelte';
  import { StorageManager } from '$lib/utils/storage.js';

  export let searchQuery = '';
  export let profileImage = null;
  export let showProfileMenu = false;
  let showStorageMenu = false;
  let storageInfo = null;

  const dispatch = createEventDispatcher();

  function handleProfileToggle(event) {
    dispatch('profileToggle', event.detail);
  }

  function handleProfileUpload(event) {
    dispatch('profileUpload', event.detail);
  }

  function handleProfileRemove() {
    dispatch('profileRemove');
  }

  function handleLogout() {
    dispatch('logout');
  }

  function toggleStorageMenu() {
    showStorageMenu = !showStorageMenu;
    if (showStorageMenu) {
      storageInfo = StorageManager.getStorageInfo();
    }
  }

  function clearAppData() {
    if (confirm('Clear all app data (except login)? This will remove cached files and preferences.')) {
      StorageManager.clearAppData();
      storageInfo = StorageManager.getStorageInfo();
      alert('App data cleared successfully!');
      window.location.reload();
    }
  }

  function cleanExpired() {
    StorageManager.cleanExpired();
    storageInfo = StorageManager.getStorageInfo();
    alert('Expired items cleaned!');
  }

  function syncStorage() {
    StorageManager.sync();
    storageInfo = StorageManager.getStorageInfo();
    alert('Storage synced!');
  }
</script>

<div class="top-bar">
  <div class="search-container">
    <i class="fas fa-search"></i>
    <input type="text" placeholder="Search for or jump to" bind:value={searchQuery} />
  </div>
  <div class="actions">
    <i class="fas fa-bell"></i>
    <button class="storage-btn" on:click={toggleStorageMenu} title="Storage Manager">
      <i class="fas fa-database"></i>
    </button>
    <ProfileMenu 
      bind:profileImage 
      bind:showMenu={showProfileMenu}
      on:toggle={handleProfileToggle}
      on:upload={handleProfileUpload}
      on:remove={handleProfileRemove}
      on:logout={handleLogout}
    />
  </div>
</div>

{#if showStorageMenu}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="storage-menu-overlay" on:click={toggleStorageMenu}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="storage-menu" on:click|stopPropagation>
      <h3><i class="fas fa-database"></i> Storage Manager</h3>
      
      {#if storageInfo}
        <div class="storage-info">
          <p><strong>Items:</strong> {storageInfo.itemCount}</p>
          <p><strong>Size:</strong> {storageInfo.totalSizeKB} KB</p>
          <p><strong>Version:</strong> {storageInfo.version}</p>
          <p><strong>Last Sync:</strong> {storageInfo.lastSync ? new Date(parseInt(storageInfo.lastSync)).toLocaleString() : 'Never'}</p>
        </div>
      {/if}
      
      <div class="storage-actions">
        <button class="btn-sync" on:click={syncStorage}>
          <i class="fas fa-sync"></i> Sync & Clean Expired
        </button>
        <button class="btn-clean" on:click={cleanExpired}>
          <i class="fas fa-broom"></i> Clean Expired Items
        </button>
        <button class="btn-clear" on:click={clearAppData}>
          <i class="fas fa-trash"></i> Clear App Data
        </button>
      </div>
      
      <button class="close-btn" on:click={toggleStorageMenu} aria-label="Close storage manager">
        <i class="fas fa-times"></i>
      </button>
    </div>
  </div>
{/if}

<style>
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

  .storage-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background 0.2s;
  }

  .storage-btn:hover {
    background: #f0f6fa;
  }

  .storage-btn i {
    font-size: 18px;
    color: #0c5489;
  }

  .storage-menu-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  }

  .storage-menu {
    background: white;
    border-radius: 8px;
    padding: 24px;
    width: 90%;
    max-width: 450px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    position: relative;
  }

  .storage-menu h3 {
    margin: 0 0 20px 0;
    color: #0c5489;
    font-size: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .storage-info {
    background: #f7f9fb;
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 20px;
  }

  .storage-info p {
    margin: 8px 0;
    font-size: 14px;
    color: #333;
  }

  .storage-info strong {
    color: #0c5489;
  }

  .storage-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .storage-actions button {
    padding: 12px 16px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
  }

  .btn-sync {
    background: #0c5489;
    color: white;
  }

  .btn-sync:hover {
    background: #094166;
  }

  .btn-clean {
    background: #4CAF50;
    color: white;
  }

  .btn-clean:hover {
    background: #45a049;
  }

  .btn-clear {
    background: #f44336;
    color: white;
  }

  .btn-clear:hover {
    background: #da190b;
  }

  .close-btn {
    position: absolute;
    top: 16px;
    right: 16px;
    background: none;
    border: none;
    font-size: 20px;
    color: #888;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background 0.2s;
  }

  .close-btn:hover {
    background: #f0f0f0;
    color: #333;
  }
</style>
