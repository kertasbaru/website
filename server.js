const app = require('./src/app');
const config = require('./src/config');
const { createLogger } = require('./src/utils/logger');
const log = createLogger('Server');

const PORT = config.PORT || 3000;

// --- Jalankan Server ---
app.listen(PORT, () => {
    log.info(`🚀 Server WUZZSTORE berjalan di http://localhost:${PORT}`);
});
