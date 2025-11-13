<script>
	import { X } from 'lucide-svelte';

	export let tag;
	export let color = '#5f6368';
	export let removable = false;

	function handleRemove() {
		if (removable) {
			dispatch('remove', tag);
		}
	}

	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();
</script>

<span class="tag-pill" style="--tag-color: {color}">
	{tag}
	{#if removable}
		<button class="remove-btn" on:click={handleRemove} type="button" aria-label="Remove tag">
			<X size={12} />
		</button>
	{/if}
</span>

<style>
	.tag-pill {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 3px 8px;
		background: var(--tag-color);
		color: white;
		border-radius: 12px;
		font-size: 11px;
		font-weight: 500;
		white-space: nowrap;
		line-height: 1.4;
	}

	.remove-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		margin: 0;
		background: transparent;
		border: none;
		cursor: pointer;
		color: rgba(255, 255, 255, 0.9);
		border-radius: 50%;
		width: 14px;
		height: 14px;
		transition: background 0.2s;
	}

	.remove-btn:hover {
		background: rgba(0, 0, 0, 0.2);
	}
</style>
