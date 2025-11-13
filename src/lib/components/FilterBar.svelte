<script>
  export let filterType = 'all';
  export let filterTag = 'all';
  export let sortDir = 'desc';
  export let availableTags = [];
</script>

<div class="recent-section">
  <div class="recent-header">
    <h3>Recent activity</h3>
    <div class="filters">
      <label>
        <span>Type</span>
        <select bind:value={filterType}>
          <option value="all">All</option>
          <option value="pdf">PDF</option>
          <option value="documents">Documents</option>
          <option value="images">Images</option>
          <option value="videos">Videos</option>
          <option value="audio">Audio</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label>
        <span>Tag</span>
        <select bind:value={filterTag}>
          <option value="all">All Tags</option>
          {#each availableTags as tag}
            <option value={tag.id}>{tag.name}</option>
          {/each}
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

<style>
  .recent-section {
    margin-bottom: 20px;
  }

  .recent-header {
    display: flex;
    flex-direction: column;
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
</style>
