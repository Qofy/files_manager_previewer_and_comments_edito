<script>
import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Auth } from '$lib/utils/auth.js';
	import { Api } from '$lib/utils/api.js';

  let rangeMonths = 12;
	let runwayInfo = 'Loading...';
	let burnValue = '--';
	let chatMessages = [];
	let burnChartInstance = null;
	let spendingChartInstance = null;

	onMount(async () => {
		if (!Auth.token()) {
			goto('/login');
			return;
		}

		// Load Chart.js
		const chartScript = document.createElement('script');
		chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
		chartScript.onload = () => loadDashboard(rangeMonths);
		document.head.appendChild(chartScript);
	});

	async function loadDashboard(range) {
		try {
			const data = await Api('/dashboard/summary');
			renderDashboard(data, range);
		} catch (err) {
			console.error(err);
			runwayInfo = err.message || 'Load failed';
		}
	}

	function renderDashboard(data, rangeMonths) {
		const monthsToShow = parseInt(rangeMonths);
		const labels = data.months.slice(-monthsToShow);
		const values = data.totals.slice(-monthsToShow);

		const totalRevenue = values.reduce((a, b) => a + b, 0);
		const avgRevenue = totalRevenue / (values.length || 1);
		const cash = (data.paid_total || 0) + (data.unpaid_total || 0);
		const runwayMonthsCalc = avgRevenue > 0 ? cash / avgRevenue : 0;

		runwayInfo = runwayMonthsCalc > 0 ? `${runwayMonthsCalc.toFixed(1)} months runway` : 'No revenue yet';
		burnValue = `€ ${(values.at(-1) || 0).toFixed(2)}`;

		// Render burn rate chart
		if (typeof Chart !== 'undefined') {
			const ctx1 = document.getElementById('burnChart')?.getContext('2d');
			if (ctx1) {
				if (burnChartInstance) burnChartInstance.destroy();
				burnChartInstance = new Chart(ctx1, {
					type: 'line',
					data: {
						labels,
						datasets: [{
							label: 'Burnrate',
							data: values,
							fill: true,
							borderColor: '#0c5489',
							backgroundColor: 'rgba(12,84,137,0.15)',
							tension: 0.3,
							pointRadius: 4,
							pointBackgroundColor: '#fff',
							pointBorderColor: '#0c5489',
							pointHoverRadius: 5
						}]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						scales: {
							x: { grid: { display: false } },
							y: { beginAtZero: true, grid: { color: '#f0f0f0' } }
						},
						plugins: {
							legend: { display: false },
							tooltip: { callbacks: { label: (c) => `€ ${c.parsed.y.toFixed(2)}` } }
						}
					}
				});
			}

			// Render spending chart
			const ctx2 = document.getElementById('spendingChart')?.getContext('2d');
			if (ctx2) {
				if (spendingChartInstance) spendingChartInstance.destroy();
				const categories = data.categories.map((x) => x[0]);
				const categoryValues = data.categories.map((x) => x[1]);
				spendingChartInstance = new Chart(ctx2, {
					type: 'bar',
					data: {
						labels: categories,
						datasets: [{
							label: 'Spending',
							data: categoryValues,
							backgroundColor: '#0c5489',
							borderRadius: 4,
							barPercentage: 0.6
						}]
					},
					options: {
						indexAxis: 'y',
						responsive: true,
						maintainAspectRatio: false,
						scales: {
							x: { beginAtZero: true, grid: { color: '#f0f0f0' } },
							y: { grid: { display: false } }
						},
						plugins: {
							legend: { display: false },
							tooltip: { callbacks: { label: (c) => `€ ${c.parsed.x.toFixed(2)}` } }
						}
					}
				});
			}
		}

		// Chat messages
		chatMessages = [
			{ role: 'assistant', text: 'What about April to May this year?' },
			{ role: 'user', text: `Your average burn rate is ${avgRevenue > 0 ? `€ ${avgRevenue.toFixed(2)} per month` : 'n/a'}.` }
		];

		generateCalendar();
	}

	function generateCalendar() {
		const container = document.getElementById('calendar-container');
		if (!container) return;

		container.innerHTML = '';
		const now = new Date(),
			year = now.getFullYear(),
			month = now.getMonth();
		const monthName = now.toLocaleString('default', { month: 'long' });
		const title = document.createElement('div');
		title.style.fontWeight = '600';
		title.style.marginBottom = '5px';
		title.style.color = '#0c5489';
		title.textContent = `${monthName} ${year}`;
		container.appendChild(title);

		const table = document.createElement('table');
		table.className = 'calendar';
		const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
		const thead = document.createElement('thead');
		const trHead = document.createElement('tr');
		days.forEach((d) => {
			const th = document.createElement('th');
			th.textContent = d;
			trHead.appendChild(th);
		});
		thead.appendChild(trHead);
		table.appendChild(thead);

		const tbody = document.createElement('tbody');
		const firstDay = new Date(year, month, 1);
		let startDay = (firstDay.getDay() + 6) % 7;
		const daysInMonth = new Date(year, month + 1, 0).getDate();
		let currentDay = 1;
		for (let row = 0; row < 6; row++) {
			const tr = document.createElement('tr');
			for (let col = 0; col < 7; col++) {
				const td = document.createElement('td');
				if (row === 0 && col < startDay) td.textContent = '';
				else if (currentDay > daysInMonth) td.textContent = '';
				else {
					td.textContent = currentDay;
					if (currentDay === now.getDate()) td.classList.add('current');
					currentDay++;
				}
				tr.appendChild(td);
			}
			tbody.appendChild(tr);
		}
		table.appendChild(tbody);
		container.appendChild(table);
	}

	function handleLogout() {
		Auth.clear();
		goto('/login');
	}

	function handleDateRangeChange(e) {
		rangeMonths = e.target.value;
		loadDashboard(rangeMonths);
	}
</script>

<main class="main-content">
		<div class="top-bar">
			<div class="search-container">
				<i class="fas fa-search"></i>
				<input type="text" placeholder="Search for or jump to" />
			</div>
			<div class="actions">
				<i class="fas fa-bell"></i>
				<!-- svelte-ignore a11y_click_events_have_key_events -->
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
	.burnrate-section {
		padding: 20px;
		background: #fff;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		margin-bottom: 20px;
	}
	.burnrate-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.burnrate-controls {
		display: flex;
		gap: 10px;
	}
	.burnrate-controls select {
		padding: 4px 8px;
		border: 1px solid #ddd;
		border-radius: 4px;
	}
	.burnrate-info {
		display: flex;
		flex-wrap: wrap;
		gap: 10px 20px;
		align-items: baseline;
		margin-top: 15px;
	}
	.burnrate-info .runway {
		font-size: 16px;
		color: #888;
	}
	.burnrate-info .burn-value {
		font-size: 32px;
		font-weight: 700;
		color: #0c5489;
	}
	.burnrate-chart {
		margin-top: 20px;
		height: 250px;
	}
	.widgets-section {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 20px;
	}
	.widget {
		background: #fff;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		padding: 20px;
		min-height: 300px;
		display: flex;
		flex-direction: column;
	}
	.widget h3 {
		margin: 0 0 10px;
		color: #0c5489;
		font-weight: 600;
	}
	.chat-box {
		flex: 1;
		overflow-y: auto;
		padding-right: 10px;
	}
	.chat-message {
		margin-bottom: 12px;
		line-height: 1.4;
		font-size: 14px;
	}
	.chat-message.user {
		text-align: right;
	}
	.chat-message.assistant {
		text-align: left;
		color: #0c5489;
	}
	:global(.calendar) {
		width: 100%;
		border-collapse: collapse;
	}
	:global(.calendar th),
	:global(.calendar td) {
		text-align: center;
		padding: 5px;
		border: 1px solid #eee;
		font-size: 12px;
	}
	:global(.calendar th) {
		background: #f5f5f5;
		color: #555;
	}
	:global(.calendar td.current) {
		background: #eaf3f8;
		font-weight: 700;
		color: #0c5489;
	}
	.spending-chart {
		flex: 1;
		min-height: 200px;
	}
	h2 {
		margin: 0 0 10px;
		color: #0c5489;
		font-weight: 600;
	}
  </style>