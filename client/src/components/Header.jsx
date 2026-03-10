import { FiMenu, FiUser, FiDollarSign } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatRupiah } from '../utils/helpers';

export default function Header({ onMenuToggle }) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-dark-200 lg:ml-64">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <button onClick={onMenuToggle} className="lg:hidden text-dark-600 hover:text-dark-800 p-1">
            <FiMenu size={22} />
          </button>
          <div className="flex items-center gap-2 bg-primary-50 text-primary-700 px-4 py-1.5 rounded-full font-semibold text-sm">
            <FiDollarSign size={16} />
            {formatRupiah(user?.balance)}
          </div>
        </div>
        <Link to="/profile" className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white hover:bg-primary-700 transition-colors">
          <FiUser size={16} />
        </Link>
      </div>
    </header>
  );
}
