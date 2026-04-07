import { Link, useLocation } from 'react-router-dom';
import { UtensilsCrossed, LogOut, Shield, User as UserIcon } from 'lucide-react';
import { useAuth } from '../auth.jsx';

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (p) => p === '/' ? location.pathname === '/' : location.pathname.startsWith(p);
  const links = [
    { to: '/', label: 'Restaurants' },
  ];
  if (user?.role === 'admin') {
    links.push({ to: '/admin', label: 'Admin' });
  }

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-base font-bold text-stone-900 leading-tight">MenuMix</div>
            <div className="text-[10px] text-stone-500 uppercase tracking-wider">Multilingual menus</div>
          </div>
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(l.to)
                  ? 'bg-amber-50 text-amber-700'
                  : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
              }`}
            >
              {l.label}
            </Link>
          ))}
          {user && (
            <div className="flex items-center gap-2 ml-3 pl-3 border-l border-stone-200">
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                {user.role === 'admin' ? (
                  <Shield className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <UserIcon className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">{user.username}</span>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-stone-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
