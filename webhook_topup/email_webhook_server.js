// BARIS 1: Memuat variabel lingkungan dari file .env
require('dotenv').config();

const { google } = require('googleapis');
const axios = require('axios');

// --- 1. Konfigurasi (Ambil dari file .env) ---
const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const REDIRECT_URI = "http://localhost:3000/oauth2callback"; // Diperlukan untuk objek auth
const INTERVAL_CEK = parseInt(process.env.INTERVAL_CEK_MS) || 10000; // Default 10 detik

// --- Validasi Konfigurasi ---
if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !WEBHOOK_URL) {
  console.error('FATAL ERROR: Variabel lingkungan tidak lengkap.');
  console.error('Pastikan GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, dan WEBHOOK_URL ada di file .env');
  process.exit(1); // Hentikan skrip
}

// --- 2. Inisialisasi Klien Google ---
const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);
oAuth2Client.setCredentials({
  refresh_token: REFRESH_TOKEN,
});
const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });


// --- 3. Fungsi Helper: Mengurai Isi Email Penuh ---

/**
 * Menganalisis payload email secara rekursif untuk menemukan
 * bagian 'text/plain' dan 'text/html'.
 * @param {object} payload - Payload pesan dari Gmail API.
 * @returns {object} - Objek berisi { plain: '...', html: '...' }
 */
function getEmailBody(payload) {
  const result = {
    plain: '',
    html: '',
  };
  
  // Fungsi untuk men-decode data Base64 URL-Safe
  const decodeBase64 = (data) => {
    if (!data) return '';
    // Ganti karakter URL-safe ('-' dan '_') dengan karakter Base64 standar ('+' dan '/')
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf8');
  };

  // Fungsi rekursif untuk mencari di dalam 'parts'
  const findBodyParts = (parts) => {
    if (!parts) return;

    for (const part of parts) {
      if (part.mimeType === 'text/plain' && !result.plain) {
        if (part.body && part.body.data) {
          result.plain = decodeBase64(part.body.data);
        }
      } else if (part.mimeType === 'text/html' && !result.html) {
        if (part.body && part.body.data) {
          result.html = decodeBase64(part.body.data);
        }
      } else if (part.parts) {
        // Jika ada 'parts' di dalam 'part' (email bersarang), cari di dalamnya
        findBodyParts(part.parts);
      }
    }
  };

  // 1. Cek 'parts' (email multipart, paling umum)
  if (payload.parts) {
    findBodyParts(payload.parts);
  } 
  // 2. Cek 'body' (email non-multipart, sangat sederhana)
  else if (payload.body && payload.body.data) {
    if (payload.mimeType === 'text/plain') {
      result.plain = decodeBase64(payload.body.data);
    } else if (payload.mimeType === 'text/html') {
      result.html = decodeBase64(payload.body.data);
    }
  }

  // Jika HTML ada tapi plain tidak, coba buat versi plain dari HTML
  if (result.html && !result.plain) {
    // Hapus tag HTML secara sederhana
    result.plain = result.html.replace(/<[^>]*>?/gm, ''); 
  }

  return result;
}

// --- 4. Fungsi Helper: Mengirim Webhook ---

/**
 * Mengirim notifikasi HTTP POST (webhook) ke server panel Anda.
 */
async function sendWebhookNotification(subject, snippet, bodyObject) {
  // Data yang akan Anda kirim sebagai JSON
  // const payload = {
  //   subject: subject,
  //   snippet: snippet,
  //   body_plain: bodyObject.plain, // Mengirim isi plain text
  //   body_html: bodyObject.html   // Mengirim isi HTML
  // };
  
  const payload = {
    "text": bodyObject.plain
  }

  console.log(`   -> Mengirim webhook ke ${WEBHOOK_URL}...`);
  try {
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      // Tambahkan timeout jika server panel lambat
      timeout: 5000 // 5 detik
    });
    console.log(`   -> Webhook terkirim. Status: ${response.status}`);
  } catch (err) {
    console.error(`   -> GAGAL mengirim webhook: ${err.message}`);
    if (err.response) {
      // Menampilkan error dari server panel Anda (jika ada)
      console.error(`   -> Respon Server Panel: ${err.response.status} - ${JSON.stringify(err.response.data)}`);
    } else {
      console.error('   -> Server panel tidak merespon atau error jaringan.');
    }
  }
}


// --- 5. Fungsi Utama: Pengecekan Email ---

/**
 * Fungsi utama untuk mengecek dan memproses email.
 */
async function checkAndProcessEmails() {
  console.log(`Mengecek email (is:unread from:noreply@jago.com)...`);
  
  try {
    // 1. Ambil daftar ID pesan
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread from:noreply@jago.com', // Filter
      maxResults: 10, // Ambil 10 email teratas jika ada lonjakan
    });

    const messages = listRes.data.messages;

    // Jika tidak ada pesan, selesai untuk siklus ini
    if (!messages || messages.length === 0) {
      console.log('Tidak ada email baru yang sesuai filter.');
      return;
    }

    console.log(`DITEMUKAN ${messages.length} email baru, memproses...`);

    // 2. Loop untuk setiap pesan
    for (const message of messages) {
      try {
        // 2a. Ambil detail email penuh
        const msgRes = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full', // Minta payload penuh
        });

        const payload = msgRes.data.payload;
        const headers = payload.headers;
        const subject = headers.find(h => h.name === 'Subject').value;
        const snippet = msgRes.data.snippet;
        
        // 2b. Ekstrak isi email penuh
        const emailBody = getEmailBody(payload);

        console.log(`[Email Ditemukan] Subjek: ${subject}`);
        
        // 2c. KIRIM WEBHOOK
        await sendWebhookNotification(subject, snippet, emailBody);
        
        // 2d. TANDAI SUDAH DIBACA (Sangat Penting!)
        await gmail.users.messages.modify({
          userId: 'me',
          id: message.id,
          requestBody: {
            removeLabelIds: ['UNREAD'], // Hapus label "Belum Dibaca"
          },
        });
        console.log(`   -> Email ${message.id} telah ditandai sebagai "sudah diproses".`);

      } catch (emailErr) {
        console.error(`Gagal memproses email ID: ${message.id}`, emailErr.message);
        // Lanjutkan ke email berikutnya jika satu email gagal
      }
    }

  } catch (err) {
    console.error('Error saat siklus pengecekan email:', err.message);
    if (err.response && err.response.data.error === 'invalid_grant') {
      console.error('FATAL: Refresh token tidak valid atau dicabut. Hentikan bot.');
      process.exit(1); // Hentikan proses jika token mati
    }
  }
}

// --- 6. Mulai Server (Loop Polling) ---

console.log('=================================');
console.log('   Gmail Webhook Bot Dimulai');
console.log('=================================');
console.log(`Target Webhook   : ${WEBHOOK_URL}`);
console.log(`Interval Pengecekan: ${INTERVAL_CEK / 1000} detik`);
console.log(`Filter Email       : "is:unread from:noreply@jago.com"`);

// Buat loop rekursif yang aman (lebih baik dari setInterval untuk async)
const runCheckLoop = async () => {
  await checkAndProcessEmails();
  
  // Jadwalkan pengecekan berikutnya HANYA SETELAH pengecekan saat ini selesai
  setTimeout(runCheckLoop, INTERVAL_CEK); 
};

// Mulai loop-nya untuk pertama kali
runCheckLoop();
