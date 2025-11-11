<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Auth } from '$lib/utils/auth.js';
	import { Api } from '$lib/utils/api.js';

	let username = '';
	let password = '';
	let errorMessage = '';

	onMount(() => {
		if (Auth.token()) {
			goto('/dashboard');
		}
	});

	async function handleLogin(e) {
		e.preventDefault();
		errorMessage = '';
		try {
			const res = await Api('/auth/login', {
				method: 'POST',
				body: { username: username.trim(), password }
			});
			Auth.set(res.token);
			goto('/dashboard');
		} catch (err) {
			errorMessage = err.message || 'Login failed';
		}
	}

	async function handleRegister(e) {
		e.preventDefault();
		errorMessage = '';
		try {
			if (!username.trim() || !password) {
				errorMessage = 'Enter username and password first.';
				return;
			}
			await Api('/register', {
				method: 'POST',
				body: { username: username.trim(), password }
			});
			const res = await Api('/auth/login', {
				method: 'POST',
				body: { username: username.trim(), password }
			});
			Auth.set(res.token);
			goto('/dashboard');
		} catch (err) {
			errorMessage = err.message || 'Registration failed';
		}
	}
</script>

<svelte:head>
	<title>Login</title>
</svelte:head>

<div class="wrap">
	<h1>Sign in</h1>
	<form on:submit={handleLogin}>
		<label>Username</label>
		<input
			bind:value={username}
			type="text"
			autocomplete="username"
			required
		/>
		<label>Password</label>
		<input
			bind:value={password}
			type="password"
			autocomplete="current-password"
			required
		/>
		<button type="submit">Login</button>
		<div class="alt">
			No account? <a href="#" on:click={handleRegister}>Register</a>
		</div>
		{#if errorMessage}
			<div class="err">{errorMessage}</div>
		{/if}
	</form>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
		background: #f9f9f9;
		color: #333;
	}
	.wrap {
		max-width: 360px;
		margin: 10vh auto;
		background: #fff;
		border: 1px solid #e0e0e0;
		border-radius: 12px;
		padding: 24px;
	}
	h1 {
		margin: 0 0 12px;
		color: #0c5489;
		font-size: 20px;
	}
	label {
		display: block;
		margin: 12px 0 6px;
		font-size: 13px;
		color: #555;
	}
	input {
		width: 100%;
		padding: 10px 12px;
		border: 1px solid #ddd;
		border-radius: 8px;
	}
	button {
		width: 100%;
		margin-top: 12px;
		padding: 10px 12px;
		border: 0;
		border-radius: 8px;
		background: #0c5489;
		color: #fff;
		font-weight: 600;
		cursor: pointer;
	}
	.alt {
		margin-top: 10px;
		font-size: 13px;
		color: #666;
		text-align: center;
	}
	.err {
		margin-top: 10px;
		color: #b00020;
		font-size: 13px;
		text-align: center;
	}
</style>
