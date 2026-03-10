import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';

// Auth pages
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOTP from './pages/VerifyOTP';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Protected pages
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import TopUp from './pages/TopUp';
import Riwayat from './pages/Riwayat';
import XlAuth from './pages/XlAuth';
import XlTembak from './pages/XlTembak';
import XlAkrabV1 from './pages/XlAkrabV1';
import XlAkrabV2 from './pages/XlAkrabV2';
import XlAkrabV3 from './pages/XlAkrabV3';
import NoOtp from './pages/NoOtp';
import CekPaket from './pages/CekPaket';
import Admin from './pages/Admin';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Routes */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/topup" element={<TopUp />} />
            <Route path="/riwayat" element={<Riwayat />} />
            <Route path="/xl-auth" element={<XlAuth />} />
            <Route path="/xl-tembak" element={<XlTembak />} />
            <Route path="/xl-akrabv1" element={<XlAkrabV1 />} />
            <Route path="/xl-akrabv2" element={<XlAkrabV2 />} />
            <Route path="/xl-akrabv3" element={<XlAkrabV3 />} />
            <Route path="/no-otp" element={<NoOtp />} />
            <Route path="/cek-paket" element={<CekPaket />} />
            <Route path="/admin" element={<Admin />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
