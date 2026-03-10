const pool = require('../db'); // Mengimpor koneksi database
const jwt = require('jsonwebtoken');

// Membaca konfigurasi dari .env
const config = require('../config');
const { createLogger } = require('../utils/logger');
const log = createLogger('Auth');

// Fungsi Helper untuk mengambil satu baris data dari database
const dbGet = async (sql, params = []) => {
    const [rows] = await pool.execute(sql, params);
    return rows[0]; // Mengembalikan baris pertama saja
};

// Middleware: Mengecek apakah user sudah Login (JWT atau Session)
const isAuthenticated = (req, res, next) => {
    // Cek JWT access token di header Authorization
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, config.SECRET.JWT);
            req.userId = decoded.userId;
            return next();
        } catch (err) {
            // Token tidak valid atau expired
            return res.status(401).json({ success: false, message: 'Access token tidak valid atau telah kedaluwarsa.' });
        }
    }

    // Fallback: cek session (backward compatibility)
    if (req.session && req.session.userId) {
        req.userId = req.session.userId;
        return next();
    }

    // Tidak ada autentikasi
    res.status(401).json({ success: false, message: 'Sesi tidak valid. Silakan login kembali.' });
};

// Middleware: Mengecek apakah user adalah ADMIN
const isAdmin = async (req, res, next) => {
    // Gunakan req.userId yang sudah di-set oleh isAuthenticated
    const userId = req.userId || (req.session && req.session.userId);
    if (!userId) {
        return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }
    try {
        // Ambil data user dari database berdasarkan ID
        const user = await dbGet(`SELECT email, username FROM users WHERE id = ?`, [userId]);
        
        // Bandingkan data user dengan data ADMIN di .env
        if (user && user.email === config.ADMIN.EMAIL && user.username === config.ADMIN.USERNAME) {
            return next(); // User valid sebagai Admin, silakan lanjut
        }
        
        // Jika bukan admin
        return res.status(403).json({ success: false, message: 'Akses ditolak. Hanya untuk admin.' });
    } catch (error) {
        // Error handling jika database bermasalah
        log.error('Kesalahan server saat validasi admin: ' + error.message);
        return res.status(500).json({ success: false, message: 'Kesalahan server saat validasi admin.' });
    }
};

module.exports = { isAuthenticated, isAdmin };