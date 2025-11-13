<script>
	import { createEventDispatcher } from 'svelte';
	import { User, Camera, Trash2, LogOut } from 'lucide-svelte';

	export let profileImage = null;
	export let showMenu = false;

	const dispatch = createEventDispatcher();

	let fileInput;

	function toggleMenu() {
		showMenu = !showMenu;
		dispatch('toggle', { showMenu });
	}

	function triggerFileInput() {
		fileInput.click();
	}

	async function handleImageUpload(e) {
		const file = e.target.files?.[0];
		if (!file) return;

		// Validate file type
		if (!file.type.startsWith('image/')) {
			alert('Please select an image file');
			return;
		}

		// Validate file size (max 2MB)
		if (file.size > 2 * 1024 * 1024) {
			alert('Image size must be less than 2MB');
			return;
		}

		// Convert to base64
		const reader = new FileReader();
		reader.onload = async (event) => {
			const base64Image = event.target.result;
			dispatch('upload', { image: base64Image });
		};
		reader.readAsDataURL(file);
	}

	function removeProfileImage() {
		if (confirm('Remove profile image?')) {
			dispatch('remove');
		}
	}

	function handleLogout() {
		dispatch('logout');
	}

	function handleClickOutside(e) {
		if (showMenu && !e.target.closest('.profile-container')) {
			showMenu = false;
			dispatch('toggle', { showMenu: false });
		}
	}
</script>

<svelte:window on:click={handleClickOutside} />

<div class="profile-container">
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="profile"
		on:click={toggleMenu}
		role="button"
		tabindex="0"
		style={profileImage
			? `background-image: url(${profileImage}); background-size: cover; background-position: center;`
			: ''}
	>
		{#if !profileImage}
			<User size={18} />
		{/if}
	</div>

	{#if showMenu}
		<div class="profile-menu">
			<div class="menu-header">Profile</div>
			<button class="menu-item" on:click={triggerFileInput}>
				<Camera size={16} />
				{profileImage ? 'Change Photo' : 'Upload Photo'}
			</button>
			{#if profileImage}
				<button class="menu-item" on:click={removeProfileImage}>
					<Trash2 size={16} />
					Remove Photo
				</button>
			{/if}
			<div class="menu-divider"></div>
			<button class="menu-item" on:click={handleLogout}>
				<LogOut size={16} />
				Logout
			</button>
		</div>
	{/if}
</div>

<!-- Hidden file input -->
<input
	type="file"
	bind:this={fileInput}
	on:change={handleImageUpload}
	accept="image/*"
	style="display: none;"
/>

<style>
	.profile-container {
		position: relative;
	}

	.profile {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: #0c5489;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-size: 14px;
		position: relative;
		overflow: hidden;
	}

	.profile:hover {
		opacity: 0.9;
	}

	.profile-menu {
		position: absolute;
		top: 45px;
		right: 0;
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		min-width: 200px;
		z-index: 1000;
		overflow: hidden;
	}

	.menu-header {
		padding: 12px 16px;
		font-weight: 600;
		color: #0c5489;
		border-bottom: 1px solid #e0e0e0;
		font-size: 14px;
	}

	.menu-item {
		width: 100%;
		padding: 12px 16px;
		background: none;
		border: none;
		text-align: left;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 10px;
		color: #333;
		font-size: 14px;
		transition: background 0.2s;
	}

	.menu-item:hover {
		background: #f5f5f5;
	}

	.menu-item :global(svg) {
		flex-shrink: 0;
		color: #0c5489;
	}

	.menu-divider {
		height: 1px;
		background: #e0e0e0;
		margin: 4px 0;
	}
</style>
