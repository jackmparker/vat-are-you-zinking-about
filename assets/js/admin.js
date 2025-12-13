/**
 * WP Sync DB Simple Admin JavaScript
 */

(function() {
	'use strict';

	const wpsdb = window.vayzSimple || {};
	const ajaxUrl = wpsdb.ajaxUrl || '/wp-admin/admin-ajax.php';
	const nonce = wpsdb.nonce || '';
	const connectionKey = wpsdb.connectionKey || '';
	const siteInfo = wpsdb.siteInfo || {};
	const i18n = wpsdb.i18n || {};

	let remoteUrl = '';
	let remoteKey = '';
	let connectionVerified = false;
	let migrationInProgress = false;

	// DOM Elements
	const connectionKeyInput = document.getElementById('connection-key');
	const copyKeyBtn = document.getElementById('copy-key-btn');
	const remoteUrlInput = document.getElementById('remote-url');
	const remoteKeyInput = document.getElementById('remote-key');
	const verifyConnectionBtn = document.getElementById('verify-connection-btn');
	const connectionStatus = document.getElementById('connection-status');
	const pullDatabaseBtn = document.getElementById('pull-database-btn');
	const pushDatabaseBtn = document.getElementById('push-database-btn');
	const progressSection = document.getElementById('progress-section');
	const progressBarFill = document.getElementById('progress-bar-fill');
	const progressText = document.getElementById('progress-text');
	const errorSection = document.getElementById('error-section');
	const errorMessage = document.getElementById('error-message');
	const successSection = document.getElementById('success-section');
	const successMessage = document.getElementById('success-message');

	// Copy key to clipboard
	if (copyKeyBtn && connectionKeyInput) {
		copyKeyBtn.addEventListener('click', function() {
			connectionKeyInput.select();
			connectionKeyInput.setSelectionRange(0, 99999); // For mobile devices

			try {
				document.execCommand('copy');
				copyKeyBtn.textContent = i18n.keyCopied || 'Key copied!';
				setTimeout(function() {
					copyKeyBtn.textContent = i18n.copyKey || 'Copy Key';
				}, 2000);
			} catch (err) {
				console.error('Failed to copy:', err);
			}
		});
	}

	// Verify connection
	if (verifyConnectionBtn) {
		verifyConnectionBtn.addEventListener('click', verifyConnection);
	}

	// Pull database
	if (pullDatabaseBtn) {
		pullDatabaseBtn.addEventListener('click', function() {
			startMigration('pull');
		});
	}

	// Push database
	if (pushDatabaseBtn) {
		pushDatabaseBtn.addEventListener('click', function() {
			startMigration('push');
		});
	}

	/**
	 * Verify connection to remote site
	 */
	async function verifyConnection() {
		remoteUrl = remoteUrlInput.value.trim();
		remoteKey = remoteKeyInput.value.trim();

		if (!remoteUrl || !remoteKey) {
			showError(i18n.enterRemoteUrl || 'Please enter remote URL and key');
			return;
		}

		// Normalize URL
		remoteUrl = remoteUrl.replace(/\/$/, '');

		verifyConnectionBtn.disabled = true;
		verifyConnectionBtn.textContent = i18n.verifyConnection || 'Verifying...';
		connectionStatus.textContent = '';
		connectionStatus.className = 'connection-status';

		try {
			const data = {
				action: 'vayz_verify_connection',
				url: remoteUrl,
				key: remoteKey
			};

			// Create signature using the local key (server expects local key for wp_ajax)
			const sig = await createSignature(data, connectionKey);
			data.nonce = nonce;
			data.sig = sig;

			const response = await fetch(ajaxUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams(data)
			});

			const result = await response.json();

			if (result.success) {
				connectionVerified = true;
				connectionStatus.textContent = i18n.connectionVerified || 'Connection verified!';
				connectionStatus.className = 'connection-status success';
				pullDatabaseBtn.disabled = false;
				pushDatabaseBtn.disabled = false;
			} else {
				connectionVerified = false;
				connectionStatus.textContent = result.error || (i18n.connectionFailed || 'Connection failed');
				connectionStatus.className = 'connection-status error';
				pullDatabaseBtn.disabled = true;
				pushDatabaseBtn.disabled = true;
			}
		} catch (error) {
			connectionVerified = false;
			connectionStatus.textContent = i18n.connectionFailed || 'Connection failed';
			connectionStatus.className = 'connection-status error';
			pullDatabaseBtn.disabled = true;
			pushDatabaseBtn.disabled = true;
			console.error('Connection error:', error);
		} finally {
			verifyConnectionBtn.disabled = false;
			verifyConnectionBtn.textContent = i18n.verifyConnection || 'Verify Connection';
		}
	}

	/**
	 * Start migration (pull or push)
	 */
	async function startMigration(type) {
		if (!connectionVerified) {
			showError('Please verify connection first');
			return;
		}

		if (migrationInProgress) {
			return;
		}

		migrationInProgress = true;
		hideError();
		hideSuccess();
		showProgress(0, i18n.migrationInProgress || 'Migration in progress...');

		// Disable buttons
		pullDatabaseBtn.disabled = true;
		pushDatabaseBtn.disabled = true;
		verifyConnectionBtn.disabled = true;

		try {
			if (type === 'pull') {
				await pullDatabase();
			} else {
				await pushDatabase();
			}
		} catch (error) {
			showError(error.message || 'Migration failed');
			console.error('Migration error:', error);
		} finally {
			migrationInProgress = false;
			pullDatabaseBtn.disabled = false;
			pushDatabaseBtn.disabled = false;
			verifyConnectionBtn.disabled = false;
		}
	}

	/**
	 * Pull database from remote
	 */
	async function pullDatabase() {
		const remoteAjaxUrl = remoteUrl + '/wp-admin/admin-ajax.php';

		// Step 1: Get remote site info
		showProgress(10, i18n.creatingBackup || 'Getting remote site info...');
		const remoteInfo = await remoteRequest(remoteAjaxUrl, {
			action: 'vayz_get_connection_info',
			key: remoteKey
		}, remoteKey);

		if (!remoteInfo.success || !remoteInfo.data) {
			throw new Error(remoteInfo.error || 'Failed to get remote site info');
		}

		// Step 2: Initiate migration (creates local backup)
		showProgress(20, i18n.creatingBackup || 'Creating backup...');
		const initiateData_req = {
			action: 'vayz_initiate_migration',
			action_type: 'pull',
			key: remoteKey
		};
		const initiateSig = await createSignature(initiateData_req, connectionKey);
		initiateData_req.nonce = nonce;
		initiateData_req.sig = initiateSig;

		const initiateResult = await fetch(ajaxUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams(initiateData_req)
		});
		const initiateData = await initiateResult.json();

		if (!initiateData.success) {
			throw new Error(initiateData.error || 'Failed to initiate migration');
		}

		// Step 3: Export and import tables
		const tables = remoteInfo.data.tables || [];
		const totalTables = tables.length;
		let completedTables = 0;

		for (const table of tables) {
			let offset = 0;
			let hasMore = true;

			while (hasMore) {
				showProgress(
					30 + (completedTables / totalTables) * 50,
					`${i18n.exportingTables || 'Exporting'} ${table}...`
				);

				// Export chunk from remote
				const exportResult = await remoteRequest(remoteAjaxUrl, {
					action: 'vayz_export_chunk',
					key: remoteKey,
					table: table,
					offset: offset
				}, remoteKey);

				if (!exportResult.success) {
					throw new Error(exportResult.error || 'Export failed');
				}

				// Import chunk locally
				showProgress(
					30 + (completedTables / totalTables) * 50,
					`${i18n.importingTables || 'Importing'} ${table}... (${offset} / ${exportResult.total_rows})`
				);

				// Create request data
				const importData_req = {
					action: 'vayz_import_chunk',
					key: remoteKey,
					sql: exportResult.sql,
					old_url: remoteInfo.data.url,
					new_url: siteInfo.url,
					old_path: remoteInfo.data.path,
					new_path: siteInfo.path,
					source_prefix: remoteInfo.data.prefix
				};

				// Create signature from the data that will be sent
				const sig = await createSignature(importData_req, connectionKey);

				// Add nonce and signature
				importData_req.nonce = nonce;
				importData_req.sig = sig;

				const importResult = await fetch(ajaxUrl, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
					},
					body: new URLSearchParams(importData_req)
				});
				const importData = await importResult.json();

				if (!importData.success) {
					throw new Error(importData.error || 'Import failed');
				}

				hasMore = exportResult.has_more;
				offset += exportResult.rows_exported || 1000;
			}

			completedTables++;
		}

		// Step 4: Finalize migration
		showProgress(90, i18n.finalizing || 'Finalizing migration...');
		const finalizeData_req = {
			action: 'vayz_finalize_migration',
			key: remoteKey
		};
		const finalizeSig = await createSignature(finalizeData_req, connectionKey);
		finalizeData_req.nonce = nonce;
		finalizeData_req.sig = finalizeSig;

		const finalizeResult = await fetch(ajaxUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams(finalizeData_req)
		});
		const finalizeData = await finalizeResult.json();

		if (!finalizeData.success) {
			throw new Error(finalizeData.error || 'Finalization failed');
		}

		showProgress(100, i18n.migrationComplete || 'Migration completed!');
		showSuccess(i18n.migrationComplete || 'Migration completed successfully!');
	}

	/**
	 * Push database to remote
	 */
	async function pushDatabase() {
		const remoteAjaxUrl = remoteUrl + '/wp-admin/admin-ajax.php';

		// Step 1: Get remote site info
		showProgress(10, 'Getting remote site info...');
		const remoteInfo = await remoteRequest(remoteAjaxUrl, {
			action: 'vayz_get_connection_info',
			key: remoteKey
		}, remoteKey);

		if (!remoteInfo.success || !remoteInfo.data) {
			throw new Error(remoteInfo.error || 'Failed to get remote site info');
		}

		// Step 2: Initiate migration on remote (creates remote backup)
		showProgress(20, 'Initiating migration on remote site...');
		const initiateResult = await remoteRequest(remoteAjaxUrl, {
			action: 'vayz_initiate_migration',
			action_type: 'push',
			key: remoteKey
		}, remoteKey);

		if (!initiateResult.success) {
			throw new Error(initiateResult.error || 'Failed to initiate migration');
		}

		// Step 3: Export and send tables
		const tables = siteInfo.tables || [];
		const totalTables = tables.length;
		let completedTables = 0;

		for (const table of tables) {
			let offset = 0;
			let hasMore = true;

			while (hasMore) {
				showProgress(
					30 + (completedTables / totalTables) * 50,
					`Exporting ${table}...`
				);

				// Export chunk locally
				const exportData_req = {
					action: 'vayz_export_chunk',
					key: remoteKey,
					table: table,
					offset: offset
				};
				const exportSig = await createSignature(exportData_req, connectionKey);
				exportData_req.nonce = nonce;
				exportData_req.sig = exportSig;

				const exportResult = await fetch(ajaxUrl, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
					},
					body: new URLSearchParams(exportData_req)
				});
				const exportData = await exportResult.json();

				if (!exportData.success) {
					throw new Error(exportData.error || 'Export failed');
				}

				// Import chunk on remote
				showProgress(
					30 + (completedTables / totalTables) * 50,
					`Sending ${table} to remote... (${offset} / ${exportData.total_rows})`
				);

				const importResult = await remoteRequest(remoteAjaxUrl, {
					action: 'vayz_import_chunk',
					key: remoteKey,
					sql: exportData.sql,
					old_url: siteInfo.url,
					new_url: remoteInfo.data.url,
					old_path: siteInfo.path,
					new_path: remoteInfo.data.path,
					source_prefix: siteInfo.prefix
				}, remoteKey);

				if (!importResult.success) {
					throw new Error(importResult.error || 'Import failed');
				}

				hasMore = exportData.has_more;
				offset += exportData.rows_exported || 1000;
			}

			completedTables++;
		}

		// Step 4: Finalize migration on remote
		showProgress(90, 'Finalizing migration on remote site...');
		const finalizeResult = await remoteRequest(remoteAjaxUrl, {
			action: 'vayz_finalize_migration',
			key: remoteKey
		}, remoteKey);

		if (!finalizeResult.success) {
			throw new Error(finalizeResult.error || 'Finalization failed');
		}

		showProgress(100, i18n.migrationComplete || 'Migration completed!');
		showSuccess(i18n.migrationComplete || 'Migration completed successfully!');
	}

	/**
	 * Make remote request
	 */
	async function remoteRequest(url, data, key) {
		// Create signature
		data.sig = await createSignature(data, key);

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams(data)
		});

		if (!response.ok) {
			const errorText = await response.text();
			let errorData;
			try {
				errorData = JSON.parse(errorText);
			} catch (e) {
				throw new Error(`Request failed: ${response.status} ${response.statusText}`);
			}
			throw new Error(errorData.error || errorData.message || `Request failed: ${response.status}`);
		}

		return await response.json();
	}

	/**
	 * Create HMAC signature (client-side using Web Crypto API)
	 * This ensures the signature matches exactly what PHP will receive
	 */
	async function createSignature(data, key) {
		// Remove existing signature and nonce (nonce is verified separately, not in signature)
		const cleanData = {...data};
		delete cleanData.sig;
		delete cleanData.nonce;

		// Sort data by key (matching PHP ksort)
		const sortedKeys = Object.keys(cleanData).sort();
		const sortedData = {};
		for (const k of sortedKeys) {
			sortedData[k] = cleanData[k];
		}

		// Create query string using URLSearchParams (matches how data is sent)
		const params = new URLSearchParams(sortedData);
		const queryString = params.toString();

		// Import key for HMAC
		const encoder = new TextEncoder();
		const keyData = encoder.encode(key);
		const cryptoKey = await crypto.subtle.importKey(
			'raw',
			keyData,
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign']
		);

		// Sign the query string
		const signatureBuffer = await crypto.subtle.sign(
			'HMAC',
			cryptoKey,
			encoder.encode(queryString)
		);

		// Convert to hex string (matching PHP hash_hmac output)
		const signatureArray = Array.from(new Uint8Array(signatureBuffer));
		const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

		return signatureHex;
	}

	/**
	 * Show progress
	 */
	function showProgress(percent, text) {
		if (progressSection) {
			progressSection.style.display = 'block';
		}
		if (progressBarFill) {
			progressBarFill.style.width = percent + '%';
			progressBarFill.textContent = Math.round(percent) + '%';
		}
		if (progressText) {
			progressText.textContent = text || '';
		}
	}

	/**
	 * Show error
	 */
	function showError(message) {
		if (!message || message.trim() === '') {
			hideError();
			return;
		}
		if (errorSection) {
			errorSection.style.display = 'block';
		}
		if (errorMessage) {
			errorMessage.textContent = message;
		}
	}

	/**
	 * Hide error
	 */
	function hideError() {
		if (errorSection) {
			errorSection.style.display = 'none';
		}
	}

	/**
	 * Show success
	 */
	function showSuccess(message) {
		if (!message || message.trim() === '') {
			hideSuccess();
			return;
		}
		if (successSection) {
			successSection.style.display = 'block';
		}
		if (successMessage) {
			successMessage.textContent = message;
		}
	}

	/**
	 * Hide success
	 */
	function hideSuccess() {
		if (successSection) {
			successSection.style.display = 'none';
		}
	}
})();

