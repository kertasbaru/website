const mysql = require('mysql2/promise');
const config = require('./config.js');
const { createLogger } = require('./logger.js');
const log = createLogger('SetupDB');

const dbConfig = config.MYSQL;

// =================================================================
// Definisi Skema Database Profesional
// =================================================================
const createTableQueries = [
    // Tabel 'users': Data akun pengguna
    `
    CREATE TABLE IF NOT EXISTS \`users\` (
      \`id\` INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      \`username\` VARCHAR(50) UNIQUE NOT NULL,
      \`email\` VARCHAR(255) UNIQUE NOT NULL,
      \`phone\` VARCHAR(20) DEFAULT NULL,
      \`telegram\` BIGINT DEFAULT NULL,
      \`password\` VARCHAR(255) NOT NULL,
      \`balance\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      \`api_key\` VARCHAR(36) DEFAULT NULL,
      \`otp_numbers\` JSON DEFAULT NULL,
      \`is_verified\` TINYINT(1) NOT NULL DEFAULT 0,
      \`reset_token\` VARCHAR(255) DEFAULT NULL,
      \`reset_token_expires\` DATETIME DEFAULT NULL,
      \`webhook_url\` TEXT DEFAULT NULL,
      \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX \`idx_users_email\` (\`email\`),
      INDEX \`idx_users_is_verified\` (\`is_verified\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,

    // Tabel 'deposits': Permintaan deposit saldo yang sedang menunggu
    `
    CREATE TABLE IF NOT EXISTS \`deposits\` (
      \`id\` VARCHAR(20) PRIMARY KEY,
      \`user_id\` INT UNSIGNED NOT NULL,
      \`amount\` DECIMAL(15,2) NOT NULL,
      \`status\` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
      INDEX \`idx_deposits_user_status\` (\`user_id\`, \`status\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,

    // Tabel 'deposit_history': Riwayat deposit yang sudah selesai (sukses/gagal)
    `
    CREATE TABLE IF NOT EXISTS \`deposit_history\` (
      \`id\` INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      \`deposit_id\` VARCHAR(20) NOT NULL,
      \`user_id\` INT UNSIGNED NOT NULL,
      \`amount\` DECIMAL(15,2) NOT NULL,
      \`status\` VARCHAR(20) NOT NULL,
      \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY \`uk_deposit_id\` (\`deposit_id\`),
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
      INDEX \`idx_dh_user_id\` (\`user_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,

    // Tabel 'transactions': Pencatatan pembelian produk/layanan
    `
    CREATE TABLE IF NOT EXISTS \`transactions\` (
      \`ref_id\` VARCHAR(20) PRIMARY KEY,
      \`trx_id\` VARCHAR(255) DEFAULT NULL,
      \`user_id\` INT UNSIGNED NOT NULL,
      \`product_code\` VARCHAR(100) NOT NULL,
      \`product_name\` VARCHAR(255) DEFAULT NULL,
      \`payment_method\` VARCHAR(50) DEFAULT NULL,
      \`source\` VARCHAR(10) NOT NULL DEFAULT 'WEB',
      \`destination\` VARCHAR(50) NOT NULL,
      \`price\` DECIMAL(15,2) NOT NULL,
      \`status\` VARCHAR(20) DEFAULT NULL,
      \`serial_number\` TEXT DEFAULT NULL,
      \`message\` TEXT DEFAULT NULL,
      \`meta_data\` JSON DEFAULT NULL,
      \`payment_info\` TEXT DEFAULT NULL,
      \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
      INDEX \`idx_trx_user_id\` (\`user_id\`),
      INDEX \`idx_trx_trx_id\` (\`trx_id\`),
      INDEX \`idx_trx_status\` (\`status\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,

    // Tabel 'settings': Pengaturan website dinamis (key-value)
    `
    CREATE TABLE IF NOT EXISTS \`settings\` (
      \`setting_key\` VARCHAR(100) PRIMARY KEY,
      \`setting_value\` TEXT DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,

    // Data default pengumuman
    `
    INSERT IGNORE INTO \`settings\` (\`setting_key\`, \`setting_value\`) VALUES ('announcement', 'Selamat datang di WUZZSTORE! Semua layanan berjalan normal.');
    `,

    // Tabel 'products': Katalog produk layanan (sebelumnya 'no_otp')
    `
    CREATE TABLE IF NOT EXISTS \`products\` (
      \`id\` INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      \`product_id\` INT UNSIGNED NOT NULL,
      \`product_name\` VARCHAR(255) NOT NULL,
      \`amount\` DECIMAL(15,2) NOT NULL,
      \`category\` VARCHAR(100) NOT NULL,
      \`provider\` VARCHAR(100) NOT NULL,
      \`description\` TEXT NOT NULL,
      \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY \`uk_product_id\` (\`product_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
];

// =================================================================
// Fungsi Utama Setup
// =================================================================
async function setupDatabase() {
    let connection;
    try {
        // Langkah A: Buat koneksi untuk membuat database jika belum ada
        connection = await mysql.createConnection({
            host: dbConfig.HOST,
            user: dbConfig.USERNAME,
            password: dbConfig.PASSWORD,
            port: dbConfig.PORT
        });

        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        log.info(`Database '${dbConfig.DATABASE}' berhasil dibuat atau sudah ada.`);
        await connection.end();

        // Langkah B: Koneksi ke database untuk membuat tabel
        const pool = mysql.createPool({
            host: dbConfig.HOST,
            user: dbConfig.USERNAME,
            password: dbConfig.PASSWORD,
            database: dbConfig.DATABASE,
            port: dbConfig.PORT
        });
        const conn = await pool.getConnection();
        log.info(`Berhasil terhubung ke database '${dbConfig.DATABASE}'.`);

        log.info('Membuat tabel...');
        for (const query of createTableQueries) {
            await conn.query(query);
            const tableNameMatch = query.match(/`(\w+)`/);
            if (tableNameMatch && tableNameMatch[1]) {
                log.info(` -> Tabel '${tableNameMatch[1]}' berhasil disiapkan.`);
            }
        }

        log.info('Semua tabel berhasil disiapkan.');

        conn.release();
        await pool.end();

        log.info('Setup database selesai!');

    } catch (error) {
        log.error('Terjadi kesalahan saat setup database: ' + error.message);
        if (connection) {
            await connection.end();
        }
        process.exit(1);
    }
}

setupDatabase();
