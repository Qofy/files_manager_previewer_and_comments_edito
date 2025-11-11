<script>
	import { onMount } from 'svelte';
	import FileAside from '$lib/pages/FileAside.svelte';
	import FileMain from '$lib/pages/FileMain.svelte';

	
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
	<FileAside/>
	<FileMain/>
</div>

<style>
	:global(*) {
		box-sizing: border-box;
	}

		 :global(body) {
		margin: 0;
		font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
		background: #f9f9f9;
		color: #333;
	}
	:global(a) {
		text-decoration: none;
		color: inherit;
	}
	:global(.app-container) {
		display: flex;
		min-height: 100vh;
		overflow: hidden;
	}
</style>
