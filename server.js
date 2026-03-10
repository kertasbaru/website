const express = require('express');              // Framework web server utama
const path = require('path');                    // Utilitas untuk menangani path file/direktori
const session = require('express-session');      // Middleware untuk manajemen sesi login
const MySQLStore = require('express-mysql-session')(session); // Menyimpan sesi di MySQL
const config = require('./config.js');           // Konfigurasi dari .env
const pool = require('./database.js');           // Koneksi database yang sudah dibuat sebelumnya
const { createLogger } = require('./logger.js'); // Logger terpusat
const log = createLogger('Server');

// Impor File Rute (Routing)
const pageRoutes = require('./routes/pages.js');      // Menangani halaman fallback & logout
const apiRoutes = require('./routes/api.js');         // Menangani API (Data JSON)
const webhookRoutes = require('./routes/webhooks.js');// Menangani callback/webhook dari pihak ketiga

const app = express();
const PORT = config.PORT || 3000;

// Menyiapkan penyimpanan sesi di database MySQL
const sessionStore = new MySQLStore({}, pool);

// --- Middleware ---
app.use(express.json());                           // Mengizinkan server membaca data JSON dari request body
app.use(express.urlencoded({ extended: true }));   // Mengizinkan server membaca data Form (POST)

// Konfigurasi Sesi Login
app.use(session({
    secret: config.SECRET.JWT,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// --- Gunakan Rute API & Webhook ---
app.use('/api', apiRoutes);
app.use('/', webhookRoutes);

// --- Rute Logout (session-based fallback) ---
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

// --- Serve React Frontend ---
const clientDistPath = path.join(__dirname, 'client', 'dist');
app.use(express.static(clientDistPath));

// Semua rute lain -> React app (client-side routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
});

// --- Jalankan Server ---
app.listen(PORT, () => {
    log.info(`🚀 Server WUZZSTORE berjalan di http://localhost:${PORT}`);
});
