require('dotenv').config();

const { google } = require('googleapis');
const axios = require('axios');
const { createLogger } = require('../src/utils/logger');
const log = createLogger('EmailBot');

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const REDIRECT_URI = "http://localhost:3000/oauth2callback";
const INTERVAL_CEK = parseInt(process.env.INTERVAL_CEK_MS) || 10000;
const EMAIL_FILTER = 'is:unread (from:noreply@jago.com OR from:alerts@seabank.co.id)';

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !WEBHOOK_URL) {
  log.error('FATAL ERROR: Variabel lingkungan tidak lengkap.');
  log.error('Pastikan GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, dan WEBHOOK_URL ada di file .env');
  process.exit(1);
}

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

function getEmailBody(payload) {
  const result = { plain: '', html: '' };
  
  const decodeBase64 = (data) => {
    if (!data) return '';
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf8');
  };

  const findBodyParts = (parts) => {
    if (!parts) return;
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && !result.plain) {
        if (part.body && part.body.data) result.plain = decodeBase64(part.body.data);
      } else if (part.mimeType === 'text/html' && !result.html) {
        if (part.body && part.body.data) result.html = decodeBase64(part.body.data);
      } else if (part.parts) {
        findBodyParts(part.parts);
      }
    }
  };

  if (payload.parts) {
    findBodyParts(payload.parts);
  } else if (payload.body && payload.body.data) {
    if (payload.mimeType === 'text/plain') {
      result.plain = decodeBase64(payload.body.data);
    } else if (payload.mimeType === 'text/html') {
      result.html = decodeBase64(payload.body.data);
    }
  }

  if (result.html && !result.plain) {
    result.plain = result.html.replace(/<[^>]*>?/gm, ''); 
  }

  return result;
}

async function sendWebhookNotification(subject, snippet, bodyObject) {
  const payload = { text: bodyObject.plain };

  log.info(`Mengirim webhook ke ${WEBHOOK_URL}...`);
  try {
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
    log.info(`Webhook terkirim. Status: ${response.status}`);
  } catch (err) {
    log.error(`GAGAL mengirim webhook: ${err.message}`);
    if (err.response) {
      log.error(`Respon Server Panel: ${err.response.status} - ${JSON.stringify(err.response.data)}`);
    } else {
      log.error('Server panel tidak merespon atau error jaringan.');
    }
  }
}

async function checkAndProcessEmails() {
  log.info(`Mengecek email (${EMAIL_FILTER})...`);
  
  try {
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: EMAIL_FILTER,
      maxResults: 10,
    });

    const messages = listRes.data.messages;

    if (!messages || messages.length === 0) {
      log.info('Tidak ada email baru yang sesuai filter.');
      return;
    }

    log.info(`DITEMUKAN ${messages.length} email baru, memproses...`);

    for (const message of messages) {
      try {
        const msgRes = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full',
        });

        const payload = msgRes.data.payload;
        const subjectHeader = payload.headers.find(h => h.name.toLowerCase() === 'subject');
        const subject = subjectHeader ? subjectHeader.value : '(Tanpa Subjek)';
        const snippet = msgRes.data.snippet;
        const emailBody = getEmailBody(payload);

        log.info(`[Email Ditemukan] Subjek: ${subject}`);
        
        await sendWebhookNotification(subject, snippet, emailBody);
        
        await gmail.users.messages.modify({
          userId: 'me',
          id: message.id,
          requestBody: { removeLabelIds: ['UNREAD'] },
        });
        log.info(`Email ${message.id} telah ditandai sebagai "sudah diproses".`);

      } catch (emailErr) {
        log.error(`Gagal memproses email ID: ${message.id} - ${emailErr.message}`);
      }
    }

  } catch (err) {
    log.error('Error saat siklus pengecekan email: ' + err.message);
    if (err.response && err.response.data.error === 'invalid_grant') {
      log.error('FATAL: Refresh token tidak valid atau dicabut. Hentikan bot.');
      process.exit(1);
    }
  }
}

log.info('=================================');
log.info('   Gmail Webhook Bot Dimulai');
log.info('=================================');
log.info(`Target Webhook     : ${WEBHOOK_URL}`);
log.info(`Interval Pengecekan: ${INTERVAL_CEK / 1000} detik`);
log.info(`Filter Email       : ${EMAIL_FILTER}`);

const runCheckLoop = async () => {
  await checkAndProcessEmails();
  setTimeout(runCheckLoop, INTERVAL_CEK); 
};

runCheckLoop();
