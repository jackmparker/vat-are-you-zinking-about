<?php
/**
 * Main Admin Page Template
 *
 * @var VAYZ_Admin $this
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$admin = VAYZ_Admin::get_instance();
$settings = get_option( 'vayz_settings', array() );
$connection_key = isset( $settings['key'] ) ? $settings['key'] : '';
?>

<div class="wrap vayz-wrap">
	<h1><?php echo esc_html__( 'Vat are you zinking about?', 'vat-are-you-zinking-about' ); ?></h1>

	<div class="vayz-container">
		<!-- Connection Key Section -->
		<div class="vayz-section">
			<h2><?php echo esc_html__( 'Your Connection Key', 'vat-are-you-zinking-about' ); ?></h2>
			<p class="description">
				<?php echo esc_html__( 'Share this key with the remote site to establish a secure connection.', 'vat-are-you-zinking-about' ); ?>
			</p>
			<div class="connection-key-wrapper">
				<input type="text" id="connection-key" class="connection-key-input" value="<?php echo esc_attr( $connection_key ); ?>" readonly />
				<button type="button" id="copy-key-btn" class="button button-secondary">
					<?php echo esc_html__( 'Copy Key', 'vat-are-you-zinking-about' ); ?>
				</button>
			</div>
		</div>

		<!-- Remote Connection Section -->
		<div class="vayz-section">
			<h2><?php echo esc_html__( 'Remote Site Connection', 'vat-are-you-zinking-about' ); ?></h2>
			<p class="description">
				<?php echo esc_html__( 'Enter the URL and connection key from the remote WordPress site.', 'vat-are-you-zinking-about' ); ?>
			</p>
			<div class="remote-connection-form">
				<div class="form-row">
					<label for="remote-url">
						<?php echo esc_html__( 'Remote Site URL', 'vat-are-you-zinking-about' ); ?>
					</label>
					<input type="url" id="remote-url" class="regular-text" placeholder="https://example.com" />
					<p class="description">
						<?php echo esc_html__( 'The full URL of the remote WordPress site (including http:// or https://)', 'vat-are-you-zinking-about' ); ?>
					</p>
				</div>
				<div class="form-row">
					<label for="remote-key">
						<?php echo esc_html__( 'Remote Site Key', 'vat-are-you-zinking-about' ); ?>
					</label>
					<input type="text" id="remote-key" class="regular-text" placeholder="<?php echo esc_attr__( 'Paste connection key here', 'vat-are-you-zinking-about' ); ?>" />
					<p class="description">
						<?php echo esc_html__( 'The connection key from the remote site', 'vat-are-you-zinking-about' ); ?>
					</p>
				</div>
				<div class="form-row">
					<button type="button" id="verify-connection-btn" class="button button-secondary">
						<?php echo esc_html__( 'Verify Connection', 'vat-are-you-zinking-about' ); ?>
					</button>
					<span id="connection-status" class="connection-status"></span>
				</div>
			</div>
		</div>

		<!-- Migration Actions Section -->
		<div class="vayz-section">
			<h2><?php echo esc_html__( 'Migration Actions', 'vat-are-you-zinking-about' ); ?></h2>
			<p class="description">
				<?php echo esc_html__( 'Pull database from remote site or push database to remote site.', 'vat-are-you-zinking-about' ); ?>
			</p>
			<div class="migration-actions">
				<button type="button" id="pull-database-btn" class="button button-primary button-large" disabled>
					<?php echo esc_html__( 'Pull Database', 'vat-are-you-zinking-about' ); ?>
				</button>
				<button type="button" id="push-database-btn" class="button button-primary button-large" disabled>
					<?php echo esc_html__( 'Push Database', 'vat-are-you-zinking-about' ); ?>
				</button>
			</div>
		</div>

		<!-- Progress Section -->
		<div class="vayz-section" id="progress-section" style="display: none;">
			<h2><?php echo esc_html__( 'Migration Progress', 'vat-are-you-zinking-about' ); ?></h2>
			<div class="progress-bar-wrapper">
				<div class="progress-bar">
					<div class="progress-bar-fill" id="progress-bar-fill" style="width: 0%;"></div>
				</div>
				<div class="progress-text" id="progress-text">
					<?php echo esc_html__( 'Ready', 'vat-are-you-zinking-about' ); ?>
				</div>
			</div>
		</div>

		<!-- Error Section -->
		<div class="vayz-section" id="error-section" style="display: none;">
			<div class="notice notice-error">
				<p id="error-message" style="margin: 0;"></p>
			</div>
		</div>

		<!-- Success Section -->
		<div class="vayz-section" id="success-section" style="display: none;">
			<div class="notice notice-success">
				<p id="success-message" style="margin: 0;"></p>
			</div>
		</div>
	</div>
</div>

