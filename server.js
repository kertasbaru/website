const express = require('express');              // Framework web server utama
const path = require('path');                    // Utilitas untuk menangani path file/direktori
const session = require('express-session');      // Middleware untuk manajemen sesi login
const MySQLStore = require('express-mysql-session')(session); // Menyimpan sesi di MySQL
const config = require('./config.js');           // Konfigurasi dari .env
const pool = require('./database.js');           // Koneksi database yang sudah dibuat sebelumnya

// Impor File Rute (Routing)
// Server akan mengarahkan request ke file-file ini berdasarkan URL-nya
const pageRoutes = require('./routes/pages.js');      // Menangani halaman HTML (Dashboard, Login, dll)
const apiRoutes = require('./routes/api.js');         // Menangani API (Data JSON)
const webhookRoutes = require('./routes/webhooks.js');// Menangani callback/webhook dari pihak ketiga

const app = express();
// Menentukan port: Prioritas Environment Variable -> Config File -> Default 3000
const PORT = config.PORT || 3000;

// Mengatur EJS sebagai view engine untuk merender file .html/.ejs di folder views
app.set('view engine', 'ejs');

// Menyiapkan penyimpanan sesi di database MySQL
const sessionStore = new MySQLStore({}, pool);

// --- Middleware ---
app.use(express.json());                           // Mengizinkan server membaca data JSON dari request body
app.use(express.urlencoded({ extended: true }));   // Mengizinkan server membaca data Form (POST)
app.use(express.static(path.join(__dirname, 'public'))); // Mengatur folder 'public' untuk file CSS, JS, Gambar

// Konfigurasi Sesi Login
app.use(session({
    secret: config.SECRET.JWT,    // Kunci rahasia untuk mengenkripsi sesi (dari .env)
    store: sessionStore,          // Menyimpan data sesi di MySQL
    resave: false,                // Tidak menyimpan ulang sesi jika tidak ada perubahan
    saveUninitialized: false,     // Tidak membuat sesi kosong untuk pengunjung tanpa login
    cookie: { 
        secure: false,            // Set true jika sudah menggunakan HTTPS
        maxAge: 24 * 60 * 60 * 1000 // Durasi cookie sesi: 24 jam
    }
}));

// --- Gunakan Rute ---
app.use('/', pageRoutes);       // Semua akses root (misal: /login, /dashboard) masuk ke pageRoutes
app.use('/api', apiRoutes);     // Semua akses berawalan /api (misal: /api/produk) masuk ke apiRoutes
app.use('/', webhookRoutes);    // Webhook biasanya di root atau path khusus tanpa prefix /api

// --- Jalankan Server ---
app.listen(PORT, () => {
    console.log(`🚀 Server WUZZSTORE berjalan di http://localhost:${PORT}`);
});
