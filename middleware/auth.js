const pool = require('../database.js'); // Mengimpor koneksi database

// Membaca konfigurasi dari .env
// Ini diperlukan untuk mendapatkan kredensial ADMIN (Email & Username)
const config = require('../config.js');
const { createLogger } = require('../logger.js');
const log = createLogger('Auth');

// Fungsi Helper untuk mengambil satu baris data dari database
// Ini membungkus pool.execute agar kode lebih bersih (tidak perlu array destructuring berulang)
const dbGet = async (sql, params = []) => {
    const [rows] = await pool.execute(sql, params);
    return rows[0]; // Mengembalikan baris pertama saja
};

// Middleware: Mengecek apakah user sudah Login
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    // Return JSON untuk API routes
    res.status(401).json({ success: false, message: "Sesi tidak valid. Silakan login kembali." });
};

// Middleware: Mengecek apakah user adalah ADMIN
const isAdmin = async (req, res, next) => {
    // Cek login dasar dulu
    if (!req.session || !req.session.userId) {
        return res.status(403).json({ success: false, message: "Akses ditolak." });
    }
    try {
        // Ambil data user dari database berdasarkan ID sesi
        const user = await dbGet(`SELECT email, username FROM users WHERE id = ?`, [req.session.userId]);
        
        // Bandingkan data user dengan data ADMIN di .env
        if (user && user.email === config.ADMIN.EMAIL && user.username === config.ADMIN.USERNAME) {
            return next(); // User valid sebagai Admin, silakan lanjut
        }
        
        // Jika bukan admin
        return res.status(403).json({ success: false, message: "Akses ditolak. Hanya untuk admin." });
    } catch (error) {
        // Error handling jika database bermasalah
        log.error('Kesalahan server saat validasi admin: ' + error.message);
        return res.status(500).json({ success: false, message: "Kesalahan server saat validasi admin." });
    }
};

module.exports = { isAuthenticated, isAdmin };