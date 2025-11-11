<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Auth } from '$lib/utils/auth.js';
	import { Api } from '$lib/utils/api.js';

	let clientsMap = {};
	let currentStatus = 'Unpaid';
	let invoicesData = [];
	let selectedInvoiceId = null;
	let searchValue = '';
	let selectedInvoice = null;
	let selectedClient = null;
	let selectedProfile = null;

	onMount(async () => {
		if (!Auth.token()) {
			goto('/login');
			return;
		}
		await loadClients();
		await loadInvoices();
	});

	async function loadClients() {
		try {
			const res = await Api('/clients');
			res.forEach((cl) => {
				clientsMap[cl.id] = cl.name;
			});
		} catch (err) {
			console.error('Failed to load clients', err);
		}
	}

	async function loadInvoices() {
		let url = '/invoices';
		const params = [];
		if (currentStatus && currentStatus !== 'All') {
			params.push('status=' + encodeURIComponent(currentStatus));
		}
		if (searchValue.trim()) {
			params.push('q=' + encodeURIComponent(searchValue.trim()));
		}
		if (params.length > 0) {
			url += '?' + params.join('&');
		}
		try {
			invoicesData = await Api(url);
		} catch (err) {
			console.error(err);
		}
	}

	async function loadInvoicePreview(id) {
		try {
			selectedInvoice = await Api('/invoices/' + id);
			const [clientRes, profileRes] = await Promise.all([
				Api('/clients/' + selectedInvoice.client_id),
				Api('/profiles/' + selectedInvoice.profile_id)
			]);
			selectedClient = clientRes;
			selectedProfile = profileRes;
		} catch (err) {
			console.error(err);
		}
	}

	function selectInvoice(inv) {
		selectedInvoiceId = inv.id;
		loadInvoicePreview(inv.id);
	}

	function changeTab(status) {
		currentStatus = status;
		selectedInvoiceId = null;
		selectedInvoice = null;
		loadInvoices();
	}

	async function confirmInvoice(id) {
		try {
			await Api('/invoices/' + id + '/pay', { method: 'POST' });
			await loadInvoices();
			await loadInvoicePreview(id);
		} catch (err) {
			alert('Failed to mark invoice as paid');
		}
	}

	function declineInvoice() {
		selectedInvoiceId = null;
		selectedInvoice = null;
	}

	function handleSearchInput() {
		loadInvoices();
	}

	function handleLogout() {
		Auth.clear();
		goto('/login');
	}
</script>

<svelte:head>
	<title>Invoices</title>
	<link
		rel="stylesheet"
		href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
		crossorigin="anonymous"
		referrerpolicy="no-referrer"
	/>
</svelte:head>

<div class="app-container">
	<aside class="sidebar">
		<div class="logo"></div>
		<ul class="nav">
			<li on:click={() => goto('/dashboard')} role="button" tabindex="0"><i class="fas fa-chart-line"></i></li>
			<li class="active"><i class="fas fa-file-invoice"></i></li>
			<li on:click={() => goto('/files')} role="button" tabindex="0"><i class="fas fa-folder"></i></li>
			<li><i class="fas fa-user-friends"></i></li>
			<li><i class="fas fa-user-circle"></i></li>
			<li><i class="fas fa-cog"></i></li>
		</ul>
	</aside>
	<main class="main-content">
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

		<section class="invoices-section">
			<div class="filter-bar">
				<div class="tabs">
					<button
						class="tab {currentStatus === 'Unpaid' ? 'active' : ''}"
						on:click={() => changeTab('Unpaid')}
					>
						Todo
					</button>
					<button
						class="tab {currentStatus === 'Paid' ? 'active' : ''}"
						on:click={() => changeTab('Paid')}
					>
						Completed
					</button>
					<button
						class="tab {currentStatus === 'All' ? 'active' : ''}"
						on:click={() => changeTab('All')}
					>
						All
					</button>
				</div>
				<div class="search-rule">
					<input
						type="text"
						bind:value={searchValue}
						on:input={handleSearchInput}
						placeholder="Search rule"
					/>
					<button><i class="fas fa-filter"></i></button>
				</div>
				<div class="upload-button">
					<button>
						<i class="fas fa-upload"></i> Upload
					</button>
				</div>
			</div>
			<div class="invoice-content">
				<div class="invoice-list">
					{#if invoicesData.length === 0}
						<p style="padding:20px;color:#888;">No invoices found.</p>
					{:else}
						{#each invoicesData as inv}
							<div
								class="invoice-item {inv.id === selectedInvoiceId ? 'active' : ''}"
								on:click={() => selectInvoice(inv)}
								role="button"
								tabindex="0"
								on:keypress={(e) => e.key === 'Enter' && selectInvoice(inv)}
							>
								<div class="info">
									<div class="title">
										{clientsMap[inv.client_id] || inv.invoice_number || 'Invoice'}
									</div>
									<div class="subtitle">{inv.invoice_number}.pdf</div>
								</div>
								<span class="status {inv.status === 'Paid' ? 'completed' : 'pending'}">
									{inv.status === 'Paid' ? 'Completed' : 'Pending'}
								</span>
							</div>
						{/each}
					{/if}
				</div>
				<div class="invoice-preview">
					{#if selectedInvoice && selectedClient}
						<div class="invoice-card">
							<div class="header">
								<div class="client-logo">
									{selectedClient.name
										? selectedClient.name.charAt(0).toUpperCase()
										: selectedInvoice.invoice_number.charAt(0).toUpperCase()}
								</div>
								<div class="meta">
									{new Date(selectedInvoice.date).toLocaleString(undefined, {
										month: 'short',
										day: 'numeric',
										year: 'numeric',
										hour: '2-digit',
										minute: '2-digit'
									})}
								</div>
							</div>
							<h2>{selectedClient.name || 'Invoice'}</h2>
							<div class="details">
								<div class="row">
									<div class="label">Invoice No</div>
									<div class="value">{selectedInvoice.invoice_number}</div>
								</div>
								<div class="row">
									<div class="label">Due</div>
									<div class="value">
										{selectedInvoice.due_date
											? new Date(selectedInvoice.due_date).toLocaleDateString()
											: '-'}
									</div>
								</div>
								<div class="row">
									<div class="label">Pay online</div>
									<div class="value">
										<a
											href="/invoice/{selectedInvoice.unique_url}"
											target="_blank"
											style="color:#0c5489;text-decoration:underline;"
										>
											Open link
										</a>
									</div>
								</div>
								<div class="row">
									<div class="label">Bill to</div>
									<div class="value">
										{selectedClient.name} • {selectedClient.email || ''}
									</div>
								</div>
							</div>
							<table>
								<thead>
									<tr>
										<th>Description</th>
										<th>Qty</th>
										<th>Unit price</th>
										<th>Amount</th>
									</tr>
								</thead>
								<tbody>
									{#each selectedInvoice.items as item}
										<tr>
											<td>{item.description}</td>
											<td>{item.quantity}</td>
											<td>{item.unit_price.toFixed(2)}</td>
											<td class="amount">
												{(item.quantity * item.unit_price).toFixed(2)}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
							<div class="totals">
								<div class="row">
									<div class="label">Subtotal</div>
									<div class="value">€ {selectedInvoice.total.toFixed(2)}</div>
								</div>
								<div class="row">
									<div class="label">Total</div>
									<div class="value">€ {selectedInvoice.total.toFixed(2)}</div>
								</div>
								<div class="row">
									<div class="label">Amount due</div>
									<div class="value">€ {selectedInvoice.total.toFixed(2)}</div>
								</div>
							</div>
							{#if selectedInvoice.status !== 'Paid'}
								<div class="actions">
									<button class="confirm" on:click={() => confirmInvoice(selectedInvoice.id)}>
										Confirm
									</button>
									<button class="decline" on:click={declineInvoice}>Decline</button>
								</div>
							{/if}
						</div>
					{:else}
						<p style="color:#888;">Select an invoice from the list to preview its details.</p>
					{/if}
				</div>
			</div>
		</section>
	</main>
</div>

<style>
	:global(*) {
		box-sizing: border-box;
	}
	:global(body) {
		margin: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial,
			sans-serif;
		background: #f9f9f9;
		color: #333;
	}
	.app-container {
		display: flex;
		min-height: 100vh;
		overflow: hidden;
	}
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
	.sidebar ul li {
		margin: 15px 0;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		color: #0c5489;
		cursor: pointer;
		transition: background 0.2s ease;
	}
	.sidebar ul li:hover,
	.sidebar ul li.active {
		background: #f0f6fa;
	}
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
	.filter-bar {
		display: flex;
		align-items: center;
		margin-bottom: 10px;
		flex-wrap: wrap;
		gap: 10px;
	}
	.tabs {
		display: flex;
		gap: 10px;
	}
	.tab {
		padding: 6px 16px;
		border: 1px solid #ddd;
		border-radius: 20px;
		background: #fff;
		cursor: pointer;
		font-size: 14px;
		color: #555;
	}
	.tab.active {
		background: #0c5489;
		color: #fff;
		border-color: #0c5489;
	}
	.search-rule {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.search-rule input {
		flex: 1;
		padding: 6px 10px;
		border: 1px solid #ddd;
		border-radius: 4px;
		background: #fff;
	}
	.search-rule button {
		padding: 6px 10px;
		border: 1px solid #ddd;
		border-radius: 4px;
		background: #fff;
		cursor: pointer;
	}
	.upload-button button {
		padding: 6px 12px;
		border: 1px solid #ddd;
		border-radius: 4px;
		background: #fff;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 14px;
		color: #0c5489;
	}
	.invoice-content {
		display: flex;
		height: calc(100vh - 180px);
		min-height: 400px;
		background: #fff;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		overflow: hidden;
	}
	.invoice-list {
		width: 35%;
		border-right: 1px solid #e0e0e0;
		overflow-y: auto;
	}
	.invoice-item {
		padding: 15px 20px;
		border-bottom: 1px solid #f0f0f0;
		cursor: pointer;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.invoice-item:hover {
		background: #f5faff;
	}
	.invoice-item.active {
		background: #eaf3f8;
	}
	.invoice-item .info {
		display: flex;
		flex-direction: column;
	}
	.invoice-item .info .title {
		font-size: 15px;
		font-weight: 600;
		color: #0c5489;
	}
	.invoice-item .info .subtitle {
		font-size: 12px;
		color: #888;
	}
	.invoice-item .status {
		font-size: 12px;
		padding: 4px 8px;
		border-radius: 12px;
		border: 1px solid #ddd;
		color: #555;
	}
	.invoice-item .status.pending {
		background: #fff7e6;
		border-color: #ffd591;
		color: #d48806;
	}
	.invoice-item .status.completed {
		background: #e6fffb;
		border-color: #87e8de;
		color: #08979c;
	}
	.invoice-preview {
		flex: 1;
		padding: 20px 30px;
		overflow-y: auto;
	}
	.invoice-card {
		background: #fff;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		padding: 20px 25px;
		max-width: 600px;
		margin: 0 auto;
	}
	.invoice-card .header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 10px;
	}
	.invoice-card .header .client-logo {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: #0c5489;
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 18px;
		font-weight: bold;
	}
	.invoice-card .header .meta {
		text-align: right;
		font-size: 12px;
		color: #888;
	}
	.invoice-card h2 {
		margin-top: 0;
		font-size: 20px;
		color: #0c5489;
		margin-bottom: 5px;
	}
	.invoice-card .details {
		margin: 10px 0 20px 0;
	}
	.invoice-card .details .row {
		display: flex;
		justify-content: space-between;
		margin-bottom: 4px;
		font-size: 13px;
	}
	.invoice-card .details .row .label {
		color: #666;
	}
	.invoice-card .details .row .value {
		color: #333;
	}
	.invoice-card table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
		margin-bottom: 20px;
	}
	.invoice-card table th,
	.invoice-card table td {
		border-bottom: 1px solid #f0f0f0;
		padding: 8px 4px;
	}
	.invoice-card table th {
		text-align: left;
		background: #f7f9fb;
		color: #555;
		font-weight: 600;
	}
	.invoice-card table td.amount {
		text-align: right;
	}
	.invoice-card .totals {
		display: flex;
		justify-content: flex-end;
		flex-direction: column;
		gap: 4px;
		font-size: 14px;
	}
	.invoice-card .totals .row {
		display: flex;
		justify-content: space-between;
	}
	.invoice-card .totals .label {
		color: #666;
	}
	.invoice-card .totals .value {
		font-weight: 600;
		color: #0c5489;
	}
	.invoice-card .actions {
		display: flex;
		gap: 10px;
		justify-content: flex-end;
		margin-top: 20px;
	}
	.invoice-card .actions button {
		padding: 8px 16px;
		border-radius: 4px;
		border: none;
		cursor: pointer;
		font-size: 14px;
	}
	.invoice-card .actions .confirm {
		background: #0c5489;
		color: #fff;
	}
	.invoice-card .actions .decline {
		background: #f5f5f5;
		color: #666;
		border: 1px solid #ddd;
	}
</style>
