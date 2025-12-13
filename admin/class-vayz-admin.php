<?php
/**
 * Admin Interface Class
 *
 * Handles admin UI rendering and asset enqueuing
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class VAYZ_Admin {

	private static $instance = null;
	private $settings;

	/**
	 * Get singleton instance
	 *
	 * @return VAYZ_Admin
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor
	 */
	private function __construct() {
		$this->settings = get_option( 'vayz_settings', array() );

		// Initialize connection key if not exists
		if ( empty( $this->settings['key'] ) ) {
			$this->settings['key'] = VAYZ_Security::generate_key();
			update_option( 'vayz_settings', $this->settings );
		}

		add_action( 'admin_menu', array( $this, 'add_admin_menu' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );
		add_action( 'admin_footer', array( $this, 'remove_empty_notices' ), 999 );
	}

	/**
	 * Add admin menu
	 */
	public function add_admin_menu() {
		$hook = add_management_page(
			__( 'Vat are you zinking about?', 'vat-are-you-zinking-about' ),
			__( 'Vat are you zinking about?', 'vat-are-you-zinking-about' ),
			'export',
			'vat-are-you-zinking-about',
			array( $this, 'render_admin_page' )
		);
	}

	/**
	 * Enqueue admin assets
	 *
	 * @param string $hook Current admin page hook
	 */
	public function enqueue_assets( $hook ) {
		if ( $hook !== 'tools_page_vat-are-you-zinking-about' ) {
			return;
		}

		// Enqueue styles
		wp_enqueue_style(
			'vayz-admin',
			VAYZ_PLUGIN_URL . 'assets/css/admin.css',
			array(),
			VAYZ_VERSION
		);

		// Enqueue scripts
		wp_enqueue_script(
			'vayz-admin',
			VAYZ_PLUGIN_URL . 'assets/js/admin.js',
			array(),
			VAYZ_VERSION,
			true
		);

		// Localize script
		$core = VAYZ_Core::get_instance();
		$site_info = $core->get_site_info();

		wp_localize_script( 'vayz-admin', 'vayzSimple', array(
			'ajaxUrl' => admin_url( 'admin-ajax.php' ),
			'nonce' => wp_create_nonce( 'vayz_nonce' ),
			'connectionKey' => $this->settings['key'],
			'siteInfo' => $site_info,
			'i18n' => array(
				'verifyConnection' => __( 'Verify Connection', 'vat-are-you-zinking-about' ),
				'connectionVerified' => __( 'Connection verified successfully!', 'vat-are-you-zinking-about' ),
				'connectionFailed' => __( 'Connection failed. Please check your URL and key.', 'vat-are-you-zinking-about' ),
				'pullDatabase' => __( 'Pull Database', 'vat-are-you-zinking-about' ),
				'pushDatabase' => __( 'Push Database', 'vat-are-you-zinking-about' ),
				'migrationInProgress' => __( 'Migration in progress...', 'vat-are-you-zinking-about' ),
				'migrationComplete' => __( 'Migration completed successfully!', 'vat-are-you-zinking-about' ),
				'migrationFailed' => __( 'Migration failed:', 'vat-are-you-zinking-about' ),
				'creatingBackup' => __( 'Creating backup...', 'vat-are-you-zinking-about' ),
				'exportingTables' => __( 'Exporting tables...', 'vat-are-you-zinking-about' ),
				'importingTables' => __( 'Importing tables...', 'vat-are-you-zinking-about' ),
				'finalizing' => __( 'Finalizing migration...', 'vat-are-you-zinking-about' ),
				'copyKey' => __( 'Copy Key', 'vat-are-you-zinking-about' ),
				'keyCopied' => __( 'Key copied to clipboard!', 'vat-are-you-zinking-about' ),
				'enterRemoteUrl' => __( 'Enter remote site URL', 'vat-are-you-zinking-about' ),
				'enterRemoteKey' => __( 'Enter remote site key', 'vat-are-you-zinking-about' ),
			),
		) );
	}

	/**
	 * Remove empty admin notices
	 */
	public function remove_empty_notices() {
		$screen = get_current_screen();
		if ( ! $screen || $screen->id !== 'tools_page_vat-are-you-zinking-about' ) {
			return;
		}
		?>
		<script>
		(function() {
			// Hide empty notices
			document.querySelectorAll('.notice').forEach(function(notice) {
				var paragraphs = notice.querySelectorAll('p');
				var isEmpty = true;
				paragraphs.forEach(function(p) {
					if (p.textContent.trim() !== '') {
						isEmpty = false;
					}
				});
				if (isEmpty || notice.textContent.trim() === '') {
					notice.style.display = 'none';
				}
			});
		})();
		</script>
		<?php
	}

	/**
	 * Render admin page
	 */
	public function render_admin_page() {
		include VAYZ_PLUGIN_DIR . 'admin/views/main-page.php';
	}
}

