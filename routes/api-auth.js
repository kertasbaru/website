const express = require('express');
const router = express.Router();
const pool = require('../database.js');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const { isAuthenticated } = require('../middleware/auth.js');
const { generateOTP } = require('../module/function.js');
const { sendOTP, verifOTP, sendResetLinkEmail } = require('../module/gmail.js');
const { createLogger } = require('../logger.js');
const log = createLogger('Auth');

const config = require('../config.js');
const saltRounds = 10;

// Helper DB
const dbGet = async (sql, params = []) => { const [rows] = await pool.execute(sql, params); return rows[0]; };
const dbRun = async (sql, params = []) => { const [result] = await pool.execute(sql, params); return result; };

// --- Register ---
router.post('/register', async (req, res) => {
    const { username, phone, email, password } = req.body;
    try {
        const hash = await bcrypt.hash(password, saltRounds);
        const apikey = uuidv4();
        const otp = generateOTP();

        await dbRun(`INSERT INTO users (username, phone, email, telegram, password, api_key, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                    [username, phone, email, null, hash, apikey, 0]);
        
        req.session.unverifiedEmail = email;
        req.session.otp = otp;
        req.session.otpExpires = Date.now() + 10 * 60 * 1000;

        await sendOTP(email, otp, config);
        res.json({ success: true, message: 'OTP telah dikirim ke email Anda.', email });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            const existingUser = await dbGet('SELECT is_verified, email FROM users WHERE email = ? OR username = ?', [email, username]);
            if (existingUser && existingUser.is_verified === 0) {
                try {
                    const otp = generateOTP();
                    req.session.unverifiedEmail = existingUser.email;
                    req.session.otp = otp;
                    req.session.otpExpires = Date.now() + 10 * 60 * 1000;
                    await sendOTP(existingUser.email, otp, config);
                    return res.json({ success: true, message: 'OTP telah dikirim ulang.', email: existingUser.email });
                } catch (sendError) {
                    return res.status(500).json({ success: false, message: 'Gagal mengirim ulang OTP.' });
                }
            } else {
                return res.status(400).json({ success: false, message: 'Username atau email sudah terdaftar dan terverifikasi.' });
            }
        }
        log.error('Register error: ' + err.message);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
});

// --- Login ---
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await dbGet(`SELECT * FROM users WHERE username = ?`, [username]);
        if (!user) {
            return res.status(400).json({ success: false, message: 'Username tidak ditemukan!' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Password salah!' });
        }

        if (user.is_verified === 0) {
            const otp = generateOTP();
            req.session.unverifiedEmail = user.email;
            req.session.otp = otp;
            req.session.otpExpires = Date.now() + 10 * 60 * 1000;
            await sendOTP(user.email, otp, config);
            return res.json({ success: true, needVerification: true, message: 'Akun belum diverifikasi. OTP telah dikirim.', email: user.email });
        }

        req.session.userId = user.id;
        res.json({ success: true, message: 'Login berhasil!' });

    } catch (err) {
        log.error('Login error: ' + err.message);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server!' });
    }
});

// --- Get User Data ---
router.get('/user', isAuthenticated, async (req, res) => {
    try {
        const user = await dbGet(`SELECT id, username, phone, email, telegram, balance, api_key, webhook_url FROM users WHERE id = ?`, [req.session.userId]);
        if (!user) return res.status(404).json({ success: false, message: "User tidak ditemukan." });

        const isAdmin = user.email === config.ADMIN.EMAIL && user.username === config.ADMIN.USERNAME;
        
        res.json({ ...user, isAdmin: isAdmin });
    } catch (err) {
        log.error('Gagal mengambil data pengguna: ' + err.message);
        res.status(500).json({ success: false, message: 'Gagal mengambil data pengguna.' });
    }
});

// --- Verify OTP ---
router.post('/auth/complete-registration', async (req, res) => {
    const { otp } = req.body;
    const email = req.session.unverifiedEmail;
    if (!email) return res.status(400).json({ success: false, message: 'Sesi verifikasi tidak ditemukan. Silakan daftar ulang.' });
    
    const result = verifOTP(otp, req.session);
    if (result.success) {
        try {
            await dbRun('UPDATE users SET is_verified = 1 WHERE email = ?', [email]);
            delete req.session.unverifiedEmail;
            res.json({ success: true, message: 'Verifikasi berhasil! Anda akan diarahkan ke halaman login.' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Gagal memperbarui status verifikasi.' });
        }
    } else {
        res.status(400).json(result);
    }
});

// --- Forgot Password ---
router.post('/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        const [rows] = await connection.execute('SELECT id FROM users WHERE email = ? FOR UPDATE', [email]);
        const user = rows[0];

        if (!user) {
            await connection.commit();
            return res.json({ success: true, message: 'Jika email terdaftar, link reset password akan dikirim.' });
        }

        const token = uuidv4();
        const expires = new Date(Date.now() + 3600000);
        await connection.execute('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [token, expires, user.id]);
        await sendResetLinkEmail(email, token, config);
        
        await connection.commit();
        res.json({ success: true, message: 'Jika email terdaftar, link reset password akan dikirim.' });
    } catch (error) {
        if (connection) await connection.rollback();
        log.error('Forgot password error: ' + error.message);
        res.status(500).json({ success: false, message: 'Gagal mengirim email reset password.' });
    } finally {
        if (connection) connection.release();
    }
});

// --- Reset Password ---
router.post('/auth/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        const [rows] = await connection.execute('SELECT id, reset_token_expires FROM users WHERE reset_token = ? FOR UPDATE', [token]);
        const user = rows[0];

        if (!user || Date.now() > new Date(user.reset_token_expires).getTime()) {
            throw new Error('Token tidak valid atau telah kedaluwarsa.');
        }

        const newHash = await bcrypt.hash(newPassword, saltRounds);
        await connection.execute('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [newHash, user.id]);
        
        await connection.commit();
        res.json({ success: true, message: 'Password berhasil diubah! Anda akan diarahkan ke halaman login.' });
    } catch (error) {
        if (connection) await connection.rollback();
        res.status(400).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
