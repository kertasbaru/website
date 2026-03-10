// =================================================================
// Logger Module - Modul Logging Terpusat
// =================================================================
// Menyediakan fungsi logging dengan level dan format yang konsisten.
// Menggantikan penggunaan console.log/error/warn yang tersebar.

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

// Ambil level dari environment, default INFO
const currentLevel = LOG_LEVELS[(process.env.LOG_LEVEL || 'INFO').toUpperCase()] ?? LOG_LEVELS.INFO;

/**
 * Memformat pesan log dengan timestamp dan level.
 * @param {string} level - Level log (INFO, WARN, ERROR, DEBUG)
 * @param {string} context - Nama modul/file pemanggil
 * @param {string} message - Pesan utama
 * @returns {string} Pesan yang sudah diformat
 */
function formatMessage(level, context, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${context}] ${message}`;
}

/**
 * Membuat instance logger dengan konteks (nama modul) tertentu.
 * @param {string} context - Nama modul/file, contoh: 'Server', 'Database', 'Webhook'
 * @returns {Object} Objek logger dengan method: info, warn, error, debug
 */
function createLogger(context) {
    return {
        info: (message, ...args) => {
            if (currentLevel <= LOG_LEVELS.INFO) {
                console.log(formatMessage('INFO', context, message), ...args);
            }
        },
        warn: (message, ...args) => {
            if (currentLevel <= LOG_LEVELS.WARN) {
                console.warn(formatMessage('WARN', context, message), ...args);
            }
        },
        error: (message, ...args) => {
            if (currentLevel <= LOG_LEVELS.ERROR) {
                console.error(formatMessage('ERROR', context, message), ...args);
            }
        },
        debug: (message, ...args) => {
            if (currentLevel <= LOG_LEVELS.DEBUG) {
                console.debug(formatMessage('DEBUG', context, message), ...args);
            }
        }
    };
}

module.exports = { createLogger };
