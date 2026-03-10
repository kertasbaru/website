// =================================================================
// Script Migrasi Database: Struktur Lama → Struktur Baru
// =================================================================
// Jalankan: node migrateDatabase.js
//
// Script ini memigrasikan data dari skema lama ke skema baru:
//   - users: apikey → api_key, number_otp → otp_numbers, webhook → webhook_url
//   - deposits: top_up_id → id
//   - topup_historys → deposit_history (top_up_id → deposit_id)
//   - no_otp → products
//   - transactions: meta_data TEXT → JSON

const mysql = require('mysql2/promise');
const config = require('./config.js');
const { createLogger } = require('./logger.js');
const log = createLogger('Migrasi');

const dbConfig = config.MYSQL;

async function migrateDatabase() {
    let pool;
    let conn;
    try {
        pool = mysql.createPool({
            host: dbConfig.HOST,
            user: dbConfig.USERNAME,
            password: dbConfig.PASSWORD,
            database: dbConfig.DATABASE,
            port: dbConfig.PORT
        });
        conn = await pool.getConnection();
        log.info('Terhubung ke database. Memulai migrasi...');

        // Cek tabel yang ada
        const [tables] = await conn.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);
        log.info('Tabel yang ditemukan: ' + tableNames.join(', '));

        // ==============================================================
        // 1. MIGRASI TABEL USERS
        // ==============================================================
        if (tableNames.includes('users')) {
            const [userCols] = await conn.query('DESCRIBE `users`');
            const colNames = userCols.map(c => c.Field);

            // Rename apikey → api_key
            if (colNames.includes('apikey') && !colNames.includes('api_key')) {
                await conn.query('ALTER TABLE `users` CHANGE `apikey` `api_key` VARCHAR(36) DEFAULT NULL');
                log.info('[users] Kolom apikey → api_key');
            }

            // Rename number_otp → otp_numbers
            if (colNames.includes('number_otp') && !colNames.includes('otp_numbers')) {
                await conn.query('ALTER TABLE `users` CHANGE `number_otp` `otp_numbers` JSON DEFAULT NULL');
                log.info('[users] Kolom number_otp → otp_numbers');
            }

            // Rename webhook → webhook_url
            if (colNames.includes('webhook') && !colNames.includes('webhook_url')) {
                await conn.query('ALTER TABLE `users` CHANGE `webhook` `webhook_url` TEXT DEFAULT NULL');
                log.info('[users] Kolom webhook → webhook_url');
            }

            // Tambah created_at jika belum ada
            if (!colNames.includes('created_at')) {
                await conn.query('ALTER TABLE `users` ADD COLUMN `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
                log.info('[users] Kolom created_at ditambahkan');
            }

            // Tambah updated_at jika belum ada
            if (!colNames.includes('updated_at')) {
                await conn.query('ALTER TABLE `users` ADD COLUMN `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
                log.info('[users] Kolom updated_at ditambahkan');
            }

            log.info('[users] Migrasi selesai.');
        }

        // ==============================================================
        // 2. MIGRASI TABEL DEPOSITS (top_up_id → id)
        // ==============================================================
        if (tableNames.includes('deposits')) {
            const [depCols] = await conn.query('DESCRIBE `deposits`');
            const depColNames = depCols.map(c => c.Field);

            if (depColNames.includes('top_up_id') && !depColNames.includes('id')) {
                // Hapus foreign key dulu jika ada
                const [fks] = await conn.query(
                    `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE 
                     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'deposits' AND REFERENCED_TABLE_NAME IS NOT NULL`,
                    [dbConfig.DATABASE]
                );
                for (const fk of fks) {
                    await conn.query(`ALTER TABLE \`deposits\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
                }

                await conn.query('ALTER TABLE `deposits` CHANGE `top_up_id` `id` VARCHAR(20)');
                log.info('[deposits] Kolom top_up_id → id');

                // Tambah kembali FK jika belum ada
                try {
                    await conn.query('ALTER TABLE `deposits` ADD FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE');
                    log.info('[deposits] Foreign key user_id berhasil ditambahkan kembali.');
                } catch (e) {
                    log.warn('[deposits] Foreign key tidak ditambahkan (mungkin sudah ada atau tipe data berbeda): ' + e.message);
                }
            }

            log.info('[deposits] Migrasi selesai.');
        }

        // ==============================================================
        // 3. MIGRASI TABEL topup_historys → deposit_history
        // ==============================================================
        if (tableNames.includes('topup_historys') && !tableNames.includes('deposit_history')) {
            // Buat tabel baru
            await conn.query(`
                CREATE TABLE IF NOT EXISTS \`deposit_history\` (
                  \`id\` INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
                  \`deposit_id\` VARCHAR(20) NOT NULL,
                  \`user_id\` INT UNSIGNED NOT NULL,
                  \`amount\` DECIMAL(15,2) NOT NULL,
                  \`status\` VARCHAR(20) NOT NULL,
                  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                  UNIQUE KEY \`uk_deposit_id\` (\`deposit_id\`),
                  INDEX \`idx_dh_user_id\` (\`user_id\`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);
            log.info('[deposit_history] Tabel baru dibuat.');

            // Migrasi data
            const [oldRows] = await conn.query('SELECT * FROM `topup_historys`');
            log.info(`[deposit_history] Memigrasikan ${oldRows.length} baris dari topup_historys...`);

            for (const row of oldRows) {
                try {
                    const updatedAt = row.updated_at ? new Date(row.updated_at) : new Date();
                    await conn.query(
                        'INSERT IGNORE INTO `deposit_history` (`deposit_id`, `user_id`, `amount`, `status`, `updated_at`) VALUES (?, ?, ?, ?, ?)',
                        [row.top_up_id, row.user_id, row.amount, row.status, updatedAt]
                    );
                } catch (insertErr) {
                    log.warn(`[deposit_history] Gagal insert deposit_id=${row.top_up_id}: ${insertErr.message}`);
                }
            }

            log.info('[deposit_history] Migrasi data selesai.');
            log.info('[deposit_history] Tabel topup_historys lama TIDAK dihapus (hapus manual jika sudah yakin).');
        }

        // ==============================================================
        // 4. MIGRASI TABEL no_otp → products
        // ==============================================================
        if (tableNames.includes('no_otp') && !tableNames.includes('products')) {
            // Buat tabel baru
            await conn.query(`
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
            `);
            log.info('[products] Tabel baru dibuat.');

            // Migrasi data
            const [oldProducts] = await conn.query('SELECT * FROM `no_otp`');
            log.info(`[products] Memigrasikan ${oldProducts.length} baris dari no_otp...`);

            for (const row of oldProducts) {
                try {
                    await conn.query(
                        'INSERT IGNORE INTO `products` (`product_id`, `product_name`, `amount`, `category`, `provider`, `description`) VALUES (?, ?, ?, ?, ?, ?)',
                        [row.product_id, row.product_name, row.amount, row.category, row.provider, row.description]
                    );
                } catch (insertErr) {
                    log.warn(`[products] Gagal insert product_id=${row.product_id}: ${insertErr.message}`);
                }
            }

            log.info('[products] Migrasi data selesai.');
            log.info('[products] Tabel no_otp lama TIDAK dihapus (hapus manual jika sudah yakin).');
        }

        // ==============================================================
        // 5. MIGRASI TABEL TRANSACTIONS (meta_data TEXT → JSON)
        // ==============================================================
        if (tableNames.includes('transactions')) {
            const [trxCols] = await conn.query('DESCRIBE `transactions`');
            const metaCol = trxCols.find(c => c.Field === 'meta_data');

            if (metaCol && metaCol.Type.toLowerCase() !== 'json') {
                // Bersihkan data yang bukan JSON valid sebelum mengubah tipe kolom
                await conn.query("UPDATE `transactions` SET `meta_data` = NULL WHERE `meta_data` IS NOT NULL AND `meta_data` = ''");
                try {
                    await conn.query('ALTER TABLE `transactions` MODIFY COLUMN `meta_data` JSON DEFAULT NULL');
                    log.info('[transactions] Kolom meta_data diubah ke tipe JSON.');
                } catch (e) {
                    log.warn('[transactions] Gagal mengubah meta_data ke JSON: ' + e.message);
                    log.warn('[transactions] Mungkin ada data yang bukan format JSON valid. Silakan bersihkan manual.');
                }
            }

            log.info('[transactions] Migrasi selesai.');
        }

        log.info('========================================');
        log.info('MIGRASI DATABASE SELESAI!');
        log.info('========================================');
        log.info('Catatan: Tabel lama (topup_historys, no_otp) tidak dihapus otomatis.');
        log.info('Jalankan perintah berikut secara manual setelah memverifikasi data:');
        log.info('  DROP TABLE IF EXISTS topup_historys;');
        log.info('  DROP TABLE IF EXISTS no_otp;');

    } catch (error) {
        log.error('MIGRASI GAGAL: ' + error.message);
        log.error(error.stack);
        process.exit(1);
    } finally {
        if (conn) conn.release();
        if (pool) await pool.end();
    }
}

migrateDatabase();
