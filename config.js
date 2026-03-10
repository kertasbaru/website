require('dotenv').config();

const config = {
    ADMIN: {
        EMAIL: process.env.ADMIN_EMAIL || '',
        USERNAME: process.env.ADMIN_USERNAME || ''
    },
    SECRET: {
        JWT: process.env.SECRET_JWT || '',
        WEBHOOK: process.env.SECRET_WEBHOOK || ''
    },
    URL: {
        KHFY: process.env.URL_KHFY || '',
        KHFY2: process.env.URL_KHFY2 || '',
        KHFY3: process.env.URL_KHFY3 || '',
        KAJE: process.env.URL_KAJE || '',
        FLAZ: process.env.URL_FLAZ || ''
    },
    API: {
        KHFY: process.env.API_KHFY || '',
        KAJE: process.env.API_KAJE || '',
        FLAZ: process.env.API_FLAZ || ''
    },
    MYSQL: {
        HOST: process.env.MYSQL_HOST || '',
        PORT: process.env.MYSQL_PORT || '',
        USERNAME: process.env.MYSQL_USERNAME || '',
        PASSWORD: process.env.MYSQL_PASSWORD || '',
        DATABASE: process.env.MYSQL_DATABASE || ''
    },
    ORKUT: {
        USERNAME: process.env.ORKUT_USERNAME || '',
        TOKEN: process.env.ORKUT_TOKEN || '',
        REG_ID: process.env.ORKUT_REG_ID || '',
        PHONE_UUID: process.env.ORKUT_PHONE_UUID || ''
    },
    GMAIL: {
        CLIENT_ID: process.env.GMAIL_CLIENT_ID || '',
        CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET || '',
        REDIRECT_URI: process.env.GMAIL_REDIRECT_URI || '',
        SENDER: process.env.GMAIL_SENDER || '',
        RECEIVER: process.env.GMAIL_RECEIVER || ''
    },
    DOMAIN: process.env.DOMAIN || '',
    PORT: process.env.PORT || 3000,
    JAGO: process.env.JAGO || '',
    SEABANK: process.env.SEABANK || '',
    DATAQRIS: process.env.DATAQRIS || '',
    UNTUNG: Number(process.env.UNTUNG) || 0
};

module.exports = config;
