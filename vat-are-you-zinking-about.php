<?php
/**
 * Plugin Name: Vat are you zinking about?
 * Plugin URI: https://github.com/jackmparker/vat-are-you-zinking-about
 * Description: A simplified WordPress database migration tool for pushing and pulling databases between sites with automatic URL/path replacement and backups.
 * Version: 1.0.0
 * Author: Jack Parker
 * Author URI: https://github.com/jackmparker
 * License: GPL v3
 * Network: True
 * Text Domain: vat-are-you-zinking-about
 */

// Exit if accessed directly
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Send CORS headers immediately for AJAX requests (before WordPress initializes)
// This runs at the top level, so it executes as soon as the plugin file is loaded
if ( isset( $_REQUEST['action'] ) && strpos( $_REQUEST['action'], 'vayz_' ) === 0 ) {
	// Detect origin
	$origin = '*';
	if ( isset( $_SERVER['HTTP_ORIGIN'] ) ) {
		$origin = $_SERVER['HTTP_ORIGIN'];
	} elseif ( isset( $_SERVER['HTTP_REFERER'] ) ) {
		$referer_parts = parse_url( $_SERVER['HTTP_REFERER'] );
		if ( $referer_parts ) {
			$scheme = isset( $referer_parts['scheme'] ) ? $referer_parts['scheme'] : 'http';
			$host = isset( $referer_parts['host'] ) ? $referer_parts['host'] : '';
			$port = isset( $referer_parts['port'] ) ? ':' . $referer_parts['port'] : '';
			$origin = $scheme . '://' . $host . $port;
		}
	}

	// Send CORS headers immediately - before WordPress does anything
	if ( ! headers_sent() ) {
		header( 'Access-Control-Allow-Origin: ' . $origin );
		header( 'Access-Control-Allow-Methods: POST, GET, OPTIONS' );
		header( 'Access-Control-Allow-Headers: Content-Type, X-Requested-With' );
		header( 'Access-Control-Allow-Credentials: true' );
		header( 'Access-Control-Max-Age: 86400' );
	}

	// Handle preflight OPTIONS request
	if ( isset( $_SERVER['REQUEST_METHOD'] ) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS' ) {
		if ( function_exists( 'status_header' ) ) {
			status_header( 200 );
		} else {
			header( 'HTTP/1.1 200 OK' );
		}
		exit;
	}
}

// Define plugin constants
define( 'VAYZ_VERSION', '1.0.0' );
define( 'VAYZ_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'VAYZ_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'VAYZ_PLUGIN_BASENAME', plugin_basename( __FILE__ ) );

// Autoloader for plugin classes
spl_autoload_register( function ( $class ) {
	$prefix = 'VAYZ_';

	if ( strpos( $class, $prefix ) !== 0 ) {
		return;
	}

	$class_name = str_replace( $prefix, '', $class );
	$class_name = str_replace( '_', '-', strtolower( $class_name ) );

	$paths = array(
		'includes/class-vayz-' . $class_name . '.php',
		'admin/class-vayz-' . $class_name . '.php',
	);

	foreach ( $paths as $path ) {
		$file = VAYZ_PLUGIN_DIR . $path;
		if ( file_exists( $file ) ) {
			require_once $file;
			return;
		}
	}
} );

// Initialize plugin
function vayz_init() {
	// Check minimum PHP version
	if ( version_compare( PHP_VERSION, '7.4', '<' ) ) {
		add_action( 'admin_notices', function() {
			echo '<div class="error"><p>';
			echo esc_html__( 'Vat are you zinking about? requires PHP 7.4 or higher. Please upgrade PHP.', 'vat-are-you-zinking-about' );
			echo '</p></div>';
		} );
		return;
	}

	// Check minimum WordPress version
	if ( version_compare( get_bloginfo( 'version' ), '5.0', '<' ) ) {
		add_action( 'admin_notices', function() {
			echo '<div class="error"><p>';
			echo esc_html__( 'Vat are you zinking about? requires WordPress 5.0 or higher. Please upgrade WordPress.', 'vat-are-you-zinking-about' );
			echo '</p></div>';
		} );
		return;
	}

	// Initialize AJAX class very early to handle CORS
	VAYZ_Ajax::get_instance();

	// Crash-recovery: if a finalize step died mid-flight or produced an invalid schema,
	// automatically rollback using the recorded table rename map.
	VAYZ_Core::get_instance()->maybe_auto_rollback();

	// Initialize main classes
	if ( is_admin() ) {
		VAYZ_Admin::get_instance();
	}
}
add_action( 'plugins_loaded', 'vayz_init', 1 );

// Activation hook
register_activation_hook( __FILE__, function() {
	// Ensure uploads directory exists
	$upload_dir = wp_upload_dir();
	$backup_dir = $upload_dir['basedir'] . '/vat-are-you-zinking-about';
	if ( ! file_exists( $backup_dir ) ) {
		wp_mkdir_p( $backup_dir );
		// Create index.php to prevent directory listing
		file_put_contents( $backup_dir . '/index.php', '<?php // Silence is golden' );
	}
} );

