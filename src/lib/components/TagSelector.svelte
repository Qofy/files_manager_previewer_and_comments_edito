<script>
	import { Tag, X } from 'lucide-svelte';
	import { createEventDispatcher, onMount } from 'svelte';

	export let itemId;
	export let itemType = 'file'; // 'file' or 'folder'
	export let currentTags = [];
	export let availableTags = [];

	const dispatch = createEventDispatcher();

	let showDropdown = false;
	let dropdownElement;

	function toggleDropdown() {
		showDropdown = !showDropdown;
	}

	function toggleTag(tagId) {
		if (currentTags.includes(tagId)) {
			dispatch('remove', { itemId, itemType, tag: tagId });
		} else {
			dispatch('add', { itemId, itemType, tags: [tagId] });
		}
	}

	function handleClickOutside(event) {
		if (dropdownElement && !dropdownElement.contains(event.target)) {
			showDropdown = false;
		}
	}

	onMount(() => {
		return () => {
			showDropdown = false;
		};
	});
</script>

<svelte:window on:click={handleClickOutside} />

<div class="tag-selector" bind:this={dropdownElement}>
	<button class="tag-button" on:click|stopPropagation={toggleDropdown} type="button">
		<Tag size={14} />
		{#if currentTags.length > 0}
			<span class="tag-count">{currentTags.length}</span>
		{/if}
	</button>

	{#if showDropdown}
		<div class="tag-dropdown">
			<div class="dropdown-header">
				<span>Select Tags</span>
			</div>
			<div class="tag-list">
				{#each availableTags as tag}
					<label class="tag-option">
						<input
							type="checkbox"
							checked={currentTags.includes(tag.id)}
							on:change={() => toggleTag(tag.id)}
						/>
						<span class="tag-label" style="--tag-color: {tag.color}">
							<span class="tag-color-box"></span>
							{tag.name}
						</span>
					</label>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.tag-selector {
		position: relative;
		display: inline-block;
	}

	.tag-button {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 4px 8px;
		background: transparent;
		border: 1px solid #dadce0;
		border-radius: 4px;
		cursor: pointer;
		color: #5f6368;
		font-size: 13px;
		transition: all 0.2s;
	}

	.tag-button:hover {
		background: #f1f3f4;
		border-color: #5f6368;
	}

	.tag-count {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 16px;
		height: 16px;
		padding: 0 4px;
		background: #0c5489;
		color: white;
		border-radius: 8px;
		font-size: 10px;
		font-weight: 600;
	}

	.tag-dropdown {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 4px;
		background: white;
		border: 1px solid #dadce0;
		border-radius: 8px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
		min-width: 200px;
		z-index: 1000;
	}

	.dropdown-header {
		padding: 8px 12px;
		border-bottom: 1px solid #dadce0;
		font-size: 12px;
		font-weight: 600;
		color: #5f6368;
	}

	.tag-list {
		padding: 4px 0;
		max-height: 300px;
		overflow-y: auto;
	}

	.tag-option {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		cursor: pointer;
		transition: background 0.2s;
	}

	.tag-option:hover {
		background: #f1f3f4;
	}

	.tag-option input[type='checkbox'] {
		margin: 0;
		cursor: pointer;
	}

	.tag-label {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: #202124;
		flex: 1;
	}

	.tag-color-box {
		width: 12px;
		height: 12px;
		background: var(--tag-color);
		border-radius: 2px;
	}
</style>
