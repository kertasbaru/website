import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiHome, FiClock, FiDollarSign, FiPackage, FiSettings,
  FiPhone, FiSmartphone, FiChevronRight, FiGlobe,
  FiShield, FiLogOut, FiX
} from 'react-icons/fi';

const menuItems = [
  { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
  { path: '/riwayat', icon: FiClock, label: 'Riwayat' },
  { path: '/topup', icon: FiDollarSign, label: 'Top Up' },
  { path: '/cek-paket', icon: FiPackage, label: 'Cek Paket' },
  { path: '/profile', icon: FiSettings, label: 'Pengaturan' },
  { path: 'https://wa.me/6287897190671', icon: FiPhone, label: 'Contact', external: true },
];

const xlSubmenu = [
  { path: '/xl-auth', label: 'XL Auth' },
  { path: '/xl-tembak', label: 'XL Tembak' },
  { path: '/xl-akrabv1', label: 'XL Akrab V1' },
  { path: '/xl-akrabv2', label: 'XL Akrab V2' },
  { path: '/xl-akrabv3', label: 'XL Akrab V3' },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [xlOpen, setXlOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-primary-900 text-white z-50 transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-primary-800">
          <h1 className="text-xl font-bold tracking-wide">WUZZSTORE</h1>
          <button onClick={onClose} className="lg:hidden text-white/70 hover:text-white">
            <FiX size={20} />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-3">
          {menuItems.map((item) =>
            item.external ? (
              <a
                key={item.path}
                href={item.path}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 px-5 py-3 text-sm text-white/80 hover:bg-primary-800 hover:text-white transition-colors"
              >
                <item.icon size={18} />
                {item.label}
              </a>
            ) : (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-5 py-3 text-sm transition-colors ${isActive(item.path) ? 'bg-primary-700 text-white font-medium border-r-3 border-accent-400' : 'text-white/80 hover:bg-primary-800 hover:text-white'}`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            )
          )}

          {/* XL Submenu */}
          <div>
            <button
              onClick={() => setXlOpen(!xlOpen)}
              className="flex items-center justify-between w-full px-5 py-3 text-sm text-white/80 hover:bg-primary-800 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-3">
                <FiSmartphone size={18} />
                XL Axiata
              </span>
              <FiChevronRight className={`transition-transform ${xlOpen ? 'rotate-90' : ''}`} size={14} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${xlOpen ? 'max-h-60' : 'max-h-0'}`}>
              {xlSubmenu.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`block pl-12 pr-5 py-2.5 text-sm transition-colors ${isActive(item.path) ? 'bg-primary-700 text-white font-medium' : 'text-white/60 hover:bg-primary-800 hover:text-white'}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* No OTP */}
          <Link
            to="/no-otp"
            onClick={onClose}
            className={`flex items-center gap-3 px-5 py-3 text-sm transition-colors ${isActive('/no-otp') ? 'bg-primary-700 text-white font-medium border-r-3 border-accent-400' : 'text-white/80 hover:bg-primary-800 hover:text-white'}`}
          >
            <FiGlobe size={18} />
            No OTP
          </Link>

          {/* Admin */}
          {user?.isAdmin && (
            <Link
              to="/admin"
              onClick={onClose}
              className={`flex items-center gap-3 px-5 py-3 text-sm transition-colors ${isActive('/admin') ? 'bg-primary-700 text-white font-medium border-r-3 border-accent-400' : 'text-white/80 hover:bg-primary-800 hover:text-white'}`}
            >
              <FiShield size={18} />
              Admin
            </Link>
          )}
        </nav>

        {/* Logout */}
        <div className="border-t border-primary-800 p-3">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-5 py-3 text-sm text-white/80 hover:bg-danger-600 hover:text-white rounded-lg transition-colors"
          >
            <FiLogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
