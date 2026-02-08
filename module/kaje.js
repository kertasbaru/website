const axios = require('axios');

async function requestOtp(number) {
    try {
        const response = await axios.post(`${process.env.URL_KAJE}/xl-auth/get-otp`, { number }, { headers: { 'x-api-key': process.env.API_KAJE } });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Gagal menghubungi server XL (OTP).');
    }
}

async function loginOtp(number, otp) {
    try {
        const response = await axios.post(`${process.env.URL_KAJE}/xl-auth/login-otp`, { number, code_otp: otp }, { headers: { 'x-api-key': process.env.API_KAJE } });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Gagal menghubungi server XL (Login).');
    }
}

async function checkSession(number) {
    try {
        const response = await axios.post(`${process.env.URL_KAJE}/xl-auth/login-sesi`, { number }, { headers: { 'x-api-key': process.env.API_KAJE } });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Gagal memeriksa sesi nomor.');
    }
}

async function checkQuotas(number) {
    try {
        const response = await axios.post(`${process.env.URL_KAJE}/xl-info/quotas`, { number }, { 
            headers: { 'x-api-key': process.env.API_KAJE } 
        });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Gagal memeriksa kuota paket.');
    }
}

async function getProducts(number) {
    try {
        const response = await axios.post(`${process.env.URL_KAJE}/service/list-package-otp`, { number }, { headers: { 'x-api-key': process.env.API_KAJE } });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Gagal mengambil daftar paket.');
    }
}

async function buyPackage(purchaseData) {
    const { number, ref_id, code, payment } = purchaseData;
    try {
        const response = await axios.post(`${process.env.URL_KAJE}/service/order-package-otp`, { destination: number, ref_id, code, payment }, { headers: { 'x-api-key': process.env.API_KAJE } });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Gagal melakukan pembelian paket.');
    }
}

async function getTransactionInfo(trx_id) {
    try {
        const response = await axios.post(`${process.env.URL_KAJE}/info/trx-id`, { trx_id }, { 
            headers: { 'x-api-key': process.env.API_KAJE } 
        });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Gagal mengambil info transaksi dari provider.');
    }
}

async function getListProduct() {
    try {
        const response = await axios.post(`${process.env.URL_KAJE}/service/list-product`, {}, { 
            headers: { 'x-api-key': process.env.API_KAJE } 
        });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Gagal mengambil daftar produk.');
    }
}

async function orderProduct(data) {
    try {
        const response = await axios.post(`${process.env.URL_KAJE}/service/order-product`, data, { 
            headers: { 'x-api-key': process.env.API_KAJE } 
        });
        console.log(response.data)
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Gagal memesan produk.');
    }
}

module.exports = { requestOtp, loginOtp, checkSession, checkQuotas, getProducts, buyPackage, getTransactionInfo, getListProduct, orderProduct };
