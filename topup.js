const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./database.js'); 
const { createLogger } = require('./logger.js');
const log = createLogger('Topup');

const app = express();

// Konfigurasi Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = 3001;

// ---------------------------------------------------------
// ROUTE 1: Menampilkan Halaman HTML (Interface)
// ---------------------------------------------------------
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ---------------------------------------------------------
// ROUTE 2: API Pemrosesan Deposit (Logic Anda)
// ---------------------------------------------------------
app.get("/nurul", async (req, res) => {
  const amount = parseInt(req.query.amount);
  
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid amount provided.',
      data: null
    });
  }
  
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    const [rows] = await connection.execute(
      `SELECT * FROM deposits WHERE amount = ? AND status = 'PENDING' ORDER BY created_at ASC LIMIT 1 FOR UPDATE`, 
      [amount]
    );
    
    const row = rows[0];
    
    if (!row) {
      await connection.commit(); 
      return res.status(404).json({
        success: false,
        message: 'No pending transaction found with this amount.',
        data: null
      });
    }
    
    const { id: depositId, user_id, amount: dbAmount } = row;
    
    await connection.execute(`UPDATE users SET balance = balance + ? WHERE id = ?`, [dbAmount, user_id]);
    
    await connection.execute(
      `INSERT INTO deposit_history (deposit_id, user_id, amount, status) VALUES (?, ?, ?, ?)`, 
      [depositId, user_id, dbAmount, 'SUCCESS']
    );

    await connection.execute(`DELETE FROM deposits WHERE id = ?`, [depositId]);
    
    await connection.commit();
    
    log.info(`TopUp berhasil: deposit_id=${depositId}, user=${user_id}, amount=${dbAmount}`);

    res.status(200).json({
      success: true,
      message: 'Request Successfully',
      data: {
        topupId: depositId,
        user_id,
        status: 'success',
        message: `Berhasil menambahkan saldo pengguna dengan TopUp ID ${depositId} sebesar Rp ${dbAmount}`
      }
    });

  } catch (err) {
    log.error('Transaction Failed: ' + err.message);
    if (connection) await connection.rollback();
    
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: err.message,
      data: null
    });
  } finally {
    if (connection) connection.release();
  }
});

// Jalankan Server
app.listen(PORT, () => {
  log.info(`Server topup berjalan di port ${PORT}`);
  log.info(`Buka http://localhost:${PORT} di browser untuk melihat interface.`);
});
