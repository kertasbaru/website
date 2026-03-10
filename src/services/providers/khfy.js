const axios = require('axios'); // Library HTTP Request
const { generateRandomString } = require('../../utils/helpers'); // Import helper untuk membuat Reff ID unik
const { createLogger } = require('../../utils/logger');
const log = createLogger('KHFY');

// Fungsi 1: Mengambil Data Produk / Stok dari KHFY
// Menggunakan endpoint KHFY2 yang dikonfigurasi di .env (biasanya untuk cek stok Akrab)
async function getProductKhfy(config) {
    try {
        const response = await axios.get(config.URL.KHFY2);
        log.debug('getProductKhfy response received');
        return response.data;

    } catch (error) {
        log.error("[getProductKhfy] Error: " + error.message);
        
        throw new Error(error.response?.data?.message || 'Gagal mengambil data dari provider.');
    }
}

// Fungsi 2: Melakukan Pemesanan Produk ke KHFY
async function orderProductKhfy(data, config) {
    try {
        const { code, destination } = data;
        const ref_id = `WZ${generateRandomString(13)}`;

        const targetUrl = `${config.URL.KHFY}/trx?produk=${code}&tujuan=${destination}&reff_id=${ref_id}&api_key=${config.API.KHFY}`;

        const response = await axios.get(targetUrl);
        
        return response.data;

    } catch (error) {
        const errorMessage = error.response?.data?.msg || error.response?.data?.message || 'Gagal memesan produk dari KHFY.';
        throw new Error(errorMessage);
    }
}

module.exports = { getProductKhfy, orderProductKhfy };
