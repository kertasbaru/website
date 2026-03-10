const express = require('express');
const router = express.Router();
const pool = require('../database.js');

const { isAuthenticated } = require('../middleware/auth.js');
const { generateDynamicQris } = require('../module/qris.js');
const { generateRandomString } = require('../module/function.js');
const { createLogger } = require('../logger.js');
const log = createLogger('Payment');

const config = require('../config.js');

// Helper DB
const dbGet = async (sql, params = []) => { const [rows] = await pool.execute(sql, params); return rows[0]; };
const dbAll = async (sql, params = []) => { const [rows] = await pool.execute(sql, params); return rows; };

// --- Deposit QRIS ---
router.post('/payment/generate-qris', isAuthenticated, async (req, res) => {
    const { baseAmount } = req.body;
    const userId = req.session.userId;
    if (!baseAmount || isNaN(baseAmount) || baseAmount < 10000) {
        return res.status(400).json({ message: "Jumlah top up minimal Rp 10.000." });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [rows] = await connection.execute(`SELECT id FROM deposits WHERE user_id = ? AND status = 'PENDING' FOR UPDATE`, [userId]);
        if (rows[0]) throw new Error(`Anda masih memiliki deposit pending dengan ID ${rows[0].id}. Selesaikan atau batalkan pembayaran.`);
        
        const uniqueAmount = Math.floor(Math.random() * (150 - 50 + 1)) + 50;
        const finalAmount = parseInt(baseAmount) + uniqueAmount;
        const topUpId = `WZ${generateRandomString(13)}`;
        const finalQrisString = generateDynamicQris(config.DATAQRIS, finalAmount);
        
        await connection.execute(`INSERT INTO deposits (id, user_id, amount, status) VALUES (?, ?, ?, ?)`, [topUpId, userId, finalAmount, 'PENDING']);
        
        await connection.commit();
        res.json({ qrisString: finalQrisString, finalAmount, topUpId, rekening: config.JAGO });
    } catch (error) {
        if (connection) await connection.rollback();
        log.error('Generate QRIS error: ' + error.message);
        res.status(500).json({ message: "Gagal memproses permintaan: " + error.message });
    } finally {
        if (connection) connection.release();
    }
});

// --- Deposit Transfer Manual ---
router.post('/payment/generate-topup', isAuthenticated, async (req, res) => {
    const { baseAmount } = req.body;
    const userId = req.session.userId;
    if (!baseAmount || isNaN(baseAmount) || baseAmount < 10000) {
        return res.status(400).json({ message: "Jumlah top up minimal Rp 10.000." });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [rows] = await connection.execute(`SELECT id FROM deposits WHERE user_id = ? AND status = 'PENDING' FOR UPDATE`, [userId]);
        if (rows[0]) throw new Error(`Anda masih memiliki deposit pending dengan ID ${rows[0].id}. Selesaikan atau batalkan pembayaran.`);
        
        const uniqueAmount = Math.floor(Math.random() * (150 - 50 + 1)) + 50;
        const finalAmount = parseInt(baseAmount) + uniqueAmount;
        const topUpId = `WZ${generateRandomString(13)}`;
        
        await connection.execute(`INSERT INTO deposits (id, user_id, amount, status) VALUES (?, ?, ?, ?)`, [topUpId, userId, finalAmount, 'PENDING']);
        
        await connection.commit();
        res.json({ norek: config.JAGO, finalAmount, topUpId });
    } catch (error) {
        if (connection) await connection.rollback();
        log.error('Generate topup error: ' + error.message);
        res.status(500).json({ message: "Gagal memproses permintaan: " + error.message });
    } finally {
        if (connection) connection.release();
    }
});

// --- Detail & Status ---
router.get('/deposits/pending', isAuthenticated, async (req, res) => {
    try {
        const rows = await dbAll(`SELECT id, amount, status FROM deposits WHERE user_id = ? AND status = 'PENDING' ORDER BY created_at DESC`, [req.session.userId]);
        res.json(rows);
    } catch (err) {
        log.error('Get pending deposits error: ' + err.message);
        res.status(500).json({ message: "Gagal mengambil data." });
    }
});

router.get('/deposit/details/:topUpId', isAuthenticated, async (req, res) => {
    const { topUpId } = req.params;
    try {
        const row = await dbGet(`SELECT amount FROM deposits WHERE id = ? AND user_id = ? AND status = 'PENDING'`, [topUpId, req.session.userId]);
        if (!row) return res.status(404).json({ message: "Deposit tidak ditemukan atau sudah dibayar." });
        const finalQrisString = generateDynamicQris(config.DATAQRIS, row.amount);
        res.json({ qrisString: finalQrisString, finalAmount: row.amount, topUpId, rekening: config.JAGO });
    } catch (error) {
        log.error('Get deposit details error: ' + error.message);
        res.status(500).json({ message: "Gagal membuat ulang QRIS." });
    }
});

router.get('/deposit/detailsv2/:topUpId', isAuthenticated, async (req, res) => {
    const { topUpId } = req.params;
    try {
        const row = await dbGet(`SELECT amount FROM deposits WHERE id = ? AND user_id = ? AND status = 'PENDING'`, [topUpId, req.session.userId]);
        if (!row) return res.status(404).json({ message: "Deposit tidak ditemukan atau sudah dibayar." });
        res.json({ norek: config.JAGO, finalAmount: row.amount, topUpId });
    } catch (error) {
        log.error('Get deposit detailsv2 error: ' + error.message);
        res.status(500).json({ message: "Gagal membuat detail deposit." });
    }
});

// --- Cek Status & Batalkan ---
router.get('/deposit/status/:topUpId', isAuthenticated, async (req, res) => {
    const { topUpId } = req.params;
    try {
        let row = await dbGet(`SELECT status FROM deposit_history WHERE deposit_id = ? AND user_id = ?`, [topUpId, req.session.userId]);
        if (row) return res.json({ status: row.status });
        row = await dbGet(`SELECT status FROM deposits WHERE id = ? AND user_id = ?`, [topUpId, req.session.userId]);
        if (row) return res.json({ status: row.status });
        return res.status(404).json({ message: "Deposit tidak ditemukan." });
    } catch (err) {
        log.error('Get deposit status error: ' + err.message);
        res.status(500).json({ message: "Server error." });
    }
});

router.get('/deposit/statusv2/:topUpId', isAuthenticated, async (req, res) => {
    const { topUpId } = req.params;
    try {
        let row = await dbGet(`SELECT status FROM deposit_history WHERE deposit_id = ? AND user_id = ?`, [topUpId, req.session.userId]);
        if (row) return res.json({ status: row.status });
        row = await dbGet(`SELECT status FROM deposits WHERE id = ? AND user_id = ?`, [topUpId, req.session.userId]);
        if (row) return res.json({ status: row.status });
        return res.status(404).json({ message: "Deposit tidak ditemukan." });
    } catch (err) {
        log.error('Get deposit statusv2 error: ' + err.message);
        res.status(500).json({ message: "Server error." });
    }
});

// Pembatalan Deposit
const cancelDepositHandler = async (req, res) => {
    const { topUpId } = req.params;
    const userId = req.session.userId;
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        const [rows] = await connection.execute(`SELECT * FROM deposits WHERE id = ? AND user_id = ? AND status = 'PENDING' FOR UPDATE`, [topUpId, userId]);
        const deposit = rows[0];
        if (!deposit) throw new Error('Deposit yang menunggu pembayaran tidak ditemukan.');

        await connection.execute(`DELETE FROM deposits WHERE id = ?`, [topUpId]);
        await connection.execute(`INSERT INTO deposit_history (deposit_id, user_id, amount, status) VALUES (?, ?, ?, ?)`,
            [deposit.id, deposit.user_id, deposit.amount, 'FAILED']);

        await connection.commit();
        res.json({ success: true, message: 'Deposit berhasil dibatalkan.' });
    } catch (error) {
        if (connection) await connection.rollback();
        log.error('Cancel deposit error: ' + error.message);
        res.status(500).json({ success: false, message: 'Gagal membatalkan deposit: ' + error.message });
    } finally {
        if (connection) connection.release();
    }
};

router.post('/deposit/cancel/:topUpId', isAuthenticated, cancelDepositHandler);
router.post('/deposit/cancelv2/:topUpId', isAuthenticated, cancelDepositHandler);

module.exports = router;
