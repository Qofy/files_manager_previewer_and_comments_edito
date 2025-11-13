<script>
  import {goto} from "$app/navigation"
</script>

<aside class="sidebar">
		<div class="logo"></div>
		<ul class="nav">
			
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<li on:click={() => goto('/dashboard')}><i class="fas fa-chart-line"></i></li>
		
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<li on:click={() => goto('/invoices')}><i class="fas fa-file-invoice"></i></li>
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<li class="active" on:click={()=>{goto('/files')}}><i class="fas fa-folder"></i></li>
			<li><i class="fas fa-user-friends"></i></li>
			<li><i class="fas fa-user-circle"></i></li>
			<li><i class="fas fa-cog"></i></li>
		</ul>
	</aside>

  <style>
    .sidebar {
		width: 60px;
		background: #fff;
		border-right: 1px solid #e0e0e0;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-top: 10px;
	}
	.sidebar .logo {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: #0c5489;
		margin-bottom: 20px;
	}
	.sidebar ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	:global(.sidebar ul li) {
		margin: 15px 0;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		color: #0c5489;
		cursor: pointer;
		transition: background 0.2s;
	}
	.sidebar ul li:hover,
	.sidebar ul li.active {
		background: #f0f6fa;
	}
  </style>