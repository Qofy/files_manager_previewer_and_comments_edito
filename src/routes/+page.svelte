<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Auth } from '$lib/utils/auth.js';

	let health = 'pending';

	onMount(async () => {
		// Check if user is already logged in, redirect to dashboard
		if (Auth.token()) {
			goto('/dashboard');
			return;
		}

		// Fetch server health
		try {
			const res = await fetch('/health');
			const data = await res.json();
			health = JSON.stringify(data);
		} catch (err) {
			health = 'Error: ' + err.message;
		}
	});
</script>

<svelte:head>
	<title>Quote & Invoice Maker</title>
</svelte:head>

<div class="container">
	<h1>Quote & Invoice Maker</h1>
	<p>Server health: {health}</p>
	<p>
		Welcome! This is a front‑end built with SvelteKit. Use your own client or extend this app to
		call the API endpoints for managing profiles, clients, quotes and invoices.
	</p>
	<p>
		For API documentation, run the CLI command <code>list-routes</code>.
	</p>
	<div class="actions">
		<button on:click={() => goto('/login')}>Sign In</button>
		<button on:click={() => goto('/dashboard')}>Dashboard</button>
	</div>
</div>

<style>
	:global(body) {
		font-family: sans-serif;
		margin: 20px;
		padding: 0;
		color: #333;
	}
	.container {
		max-width: 800px;
		margin: 0 auto;
	}
	h1 {
		color: #0c5489;
	}
	code {
		background: #f5f5f5;
		padding: 2px 6px;
		border-radius: 3px;
		font-family: monospace;
	}
	.actions {
		margin-top: 20px;
		display: flex;
		gap: 10px;
	}
	button {
		padding: 10px 20px;
		background: #0c5489;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
	}
	button:hover {
		background: #094168;
	}
</style>