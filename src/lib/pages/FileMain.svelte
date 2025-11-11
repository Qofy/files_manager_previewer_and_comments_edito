<script>
	import { onMount } from "svelte";
  import { Auth } from '$lib/utils/auth.js';
	import { Api } from '$lib/utils/api.js';
	import Aside from '$lib/pages/FileAside.svelte';

	let files = [];
	let searchQuery = '';
	let isLoading = true;

	onMount(async () => {
		if (!Auth.token()) {
			goto('/login');
			return;
		}

		await loadFiles();
	});

	async function loadFiles() {
		try {
			isLoading = true;
			files = await Api('/api/files');
		} catch (err) {
			console.error('Error loading files:', err);
			files = [];
		} finally {
			isLoading = false;
		}
	}

	function handleFileClick(fileId) {
		goto(`/files/${fileId}`);
	}

	function handleLogout() {
		Auth.clear();
		goto('/login');
	}

	function handleUpload() {
		alert('File upload functionality coming soon!');
	}

	$: filteredFiles = files.filter(file => 
		file.name.toLowerCase().includes(searchQuery.toLowerCase())
	);
</script>

<main class="main-content">
		<div class="top-bar">
			<div class="search-container">
				<i class="fas fa-search"></i>
				<input 
					type="text" 
					placeholder="Search files..." 
					bind:value={searchQuery}
				/>
			</div>
			<div class="actions">
				<button class="upload-btn" on:click={handleUpload}>
					<i class="fas fa-upload"></i> Upload
				</button>
				<i class="fas fa-bell"></i>
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<!-- svelte-ignore a11y-no-static-element-interactions -->
				<div class="profile" on:click={handleLogout}></div>
			</div>
		</div>

		<section class="files-section">
			<div class="section-header">
				<h2>Files</h2>
				<div class="view-controls">
					<button class="active" title="Grid view"><i class="fas fa-th"></i></button>
					<button title="List view"><i class="fas fa-list"></i></button>
				</div>
			</div>

			{#if isLoading}
				<div class="loading">
					<i class="fas fa-spinner fa-spin"></i> Loading files...
				</div>
			{:else if filteredFiles.length === 0}
				<div class="empty-state">
					<i class="fas fa-folder-open"></i>
					<p>No files found</p>
					<button on:click={handleUpload}>Upload your first file</button>
				</div>
			{:else}
				<div class="files-grid">
					{#each filteredFiles as file}
						<!-- svelte-ignore a11y-click-events-have-key-events -->
						<!-- svelte-ignore a11y-no-static-element-interactions -->
						<div class="file-card" on:click={() => handleFileClick(file.id)}>
							<div class="file-icon">
								{#if file.type === 'pdf'}
									<i class="fas fa-file-pdf"></i>
								{:else if file.type === 'image'}
									<i class="fas fa-file-image"></i>
								{:else if file.type === 'doc'}
									<i class="fas fa-file-word"></i>
								{:else}
									<i class="fas fa-file"></i>
								{/if}
							</div>
							<div class="file-info">
								<div class="file-name">{file.name}</div>
								<div class="file-meta">
									<span class="file-size">{file.size}</span>
									<span class="file-date">{new Date(file.uploaded_at).toLocaleDateString()}</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	</main>

  <style>
    .main-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 20px 30px;
		overflow-y: auto;
	}
	.top-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
	}
	.top-bar .search-container {
		flex: 1;
		position: relative;
		margin-right: 20px;
		max-width: 500px;
	}
	.top-bar .search-container input {
		width: 100%;
		padding: 8px 12px 8px 32px;
		border: 1px solid #ddd;
		border-radius: 4px;
		background: #fff;
	}
	.top-bar .search-container i {
		position: absolute;
		left: 10px;
		top: 50%;
		transform: translateY(-50%);
		color: #888;
	}
	.top-bar .actions {
		display: flex;
		align-items: center;
		gap: 15px;
	}
	.upload-btn {
		padding: 8px 16px;
		border: none;
		border-radius: 4px;
		background: #0c5489;
		color: #fff;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.upload-btn:hover {
		background: #094166;
	}
	.top-bar .actions i {
		font-size: 18px;
		color: #0c5489;
		cursor: pointer;
	}
	.top-bar .profile {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: #0c5489;
		cursor: pointer;
	}
	.files-section {
		background: #fff;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		padding: 20px;
		flex: 1;
	}
	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
	}
	.section-header h2 {
		margin: 0;
		color: #0c5489;
		font-weight: 600;
	}
	.view-controls {
		display: flex;
		gap: 8px;
	}
	.view-controls button {
		padding: 8px 12px;
		border: 1px solid #ddd;
		border-radius: 4px;
		background: #fff;
		cursor: pointer;
		color: #666;
	}
	.view-controls button:hover,
	.view-controls button.active {
		background: #f0f6fa;
		color: #0c5489;
		border-color: #0c5489;
	}
	.loading {
		text-align: center;
		padding: 60px 20px;
		color: #888;
		font-size: 16px;
	}
	.loading i {
		font-size: 32px;
		margin-bottom: 10px;
	}
	.empty-state {
		text-align: center;
		padding: 80px 20px;
		color: #888;
	}
	.empty-state i {
		font-size: 64px;
		color: #ddd;
		margin-bottom: 20px;
	}
	.empty-state p {
		font-size: 18px;
		margin: 10px 0 20px;
	}
	.empty-state button {
		padding: 10px 20px;
		border: none;
		border-radius: 4px;
		background: #0c5489;
		color: #fff;
		font-weight: 600;
		cursor: pointer;
	}
	.empty-state button:hover {
		background: #094166;
	}
	.files-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 16px;
	}
	.file-card {
		padding: 16px;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
		background: #fff;
	}
	.file-card:hover {
		border-color: #0c5489;
		box-shadow: 0 2px 8px rgba(12, 84, 137, 0.1);
		transform: translateY(-2px);
	}
	.file-icon {
		font-size: 48px;
		color: #0c5489;
		text-align: center;
		margin-bottom: 12px;
	}
	.file-info {
		text-align: center;
	}
	.file-name {
		font-weight: 600;
		color: #333;
		margin-bottom: 6px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.file-meta {
		font-size: 12px;
		color: #888;
		display: flex;
		justify-content: center;
		gap: 8px;
	}
  </style>

