<script>	

	import Aside from '$lib/pages/Aside.svelte';
import SummaryMain from '$lib/pages/SummaryMain.svelte';

</script>

<svelte:head>
	<title>Dashboard</title>
	<link
		rel="stylesheet"
		href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
		crossorigin="anonymous"
		referrerpolicy="no-referrer"
	/>
</svelte:head>

<div class="app-container">
	<Aside/>
	<!-- <main class="main-content">
		<div class="top-bar">
			<div class="search-container">
				<i class="fas fa-search"></i>
				<input type="text" placeholder="Search for or jump to" />
			</div>
			<div class="actions">
				<i class="fas fa-bell"></i>
				<div class="profile" on:click={handleLogout} role="button" tabindex="0"></div>
			</div>
		</div>

		<section class="burnrate-section">
			<div class="burnrate-header">
				<h2>Burnrate</h2>
				<div class="burnrate-controls">
					<select>
						<option value="revenue" selected>Revenue</option>
						<option value="total">Total</option>
					</select>
					<select value={rangeMonths} on:change={handleDateRangeChange}>
						<option value="12">Last 12 months</option>
						<option value="6">Last 6 months</option>
						<option value="3">Last 3 months</option>
					</select>
				</div>
			</div>
			<div class="burnrate-info">
				<div class="runway">{runwayInfo}</div>
				<div class="burn-value">{burnValue}</div>
			</div>
			<div class="burnrate-chart">
				<canvas id="burnChart"></canvas>
			</div>
		</section>

		<section class="widgets-section">
			<div class="widget assistant">
				<h3>Assistant</h3>
				<div class="chat-box">
					{#each chatMessages as msg}
						<div class="chat-message {msg.role}">{msg.text}</div>
					{/each}
				</div>
			</div>
			<div class="widget tracker">
				<h3>Tracker</h3>
				<div id="calendar-container" style="overflow-y:auto;"></div>
			</div>
			<div class="widget spending">
				<h3>Spending</h3>
				<div class="spending-chart"><canvas id="spendingChart"></canvas></div>
			</div>
		</section>
	</main> -->
<SummaryMain/>
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

