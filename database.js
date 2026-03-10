// Mengimpor library yang dibutuhkan
const mysql = require('mysql2/promise'); // Driver MySQL yang mendukung async/await (promise)
const config = require('./config.js');   // Konfigurasi dari .env

// Mengambil objek konfigurasi spesifik untuk database
const dbConfig = config.MYSQL;

// Membuat Connection Pool (kumpulan koneksi)
// Pool lebih efisien daripada membuat koneksi baru setiap kali request masuk
const pool = mysql.createPool({
    host: dbConfig.HOST,
    user: dbConfig.USERNAME,
    password: dbConfig.PASSWORD,
    database: dbConfig.DATABASE,
    port: dbConfig.PORT,
    waitForConnections: true, // Menunggu jika semua koneksi sedang terpakai
    connectionLimit: 10,      // Batas maksimal koneksi yang aktif bersamaan
    queueLimit: 0             // Batas antrian request koneksi (0 = tidak terbatas)
});

// Fungsi untuk menguji koneksi database saat aplikasi dimulai
async function testConnection() {
    let connection;
    try {
        // Mencoba mengambil satu koneksi dari pool
        connection = await pool.getConnection();
        console.log("✅ Koneksi database MySQL berhasil.");
    } catch (error) {
        // Jika gagal, tampilkan error dan matikan proses aplikasi
        console.error("❌ Gagal terhubung ke database MySQL:", error.message);
        process.exit(1);
    } finally {
        // Selalu lepaskan koneksi kembali ke pool, baik sukses maupun gagal
        if (connection) connection.release();
    }
}

// Jalankan tes koneksi
testConnection();

// Mengekspor objek 'pool' agar bisa digunakan (require) di file lain
module.exports = pool;
