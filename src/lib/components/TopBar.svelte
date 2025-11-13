<script>
  import { createEventDispatcher } from 'svelte';
  import ProfileMenu from './ProfileMenu.svelte';

  export let searchQuery = '';
  export let profileImage = null;
  export let showProfileMenu = false;

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
</script>

<div class="top-bar">
  <div class="search-container">
    <i class="fas fa-search"></i>
    <input type="text" placeholder="Search for or jump to" bind:value={searchQuery} />
  </div>
  <div class="actions">
    <i class="fas fa-bell"></i>
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
</style>
