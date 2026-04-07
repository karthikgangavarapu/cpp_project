import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UtensilsCrossed, Mail, Lock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../auth.jsx';
import * as api from '../api.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      login({
        id: res.data.userId,
        username: res.data.username,
        role: res.data.role,
        email,
        preferred_language: res.data.preferred_language,
      }, res.data.token);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const demo = (type) => {
    if (type === 'admin') {
      setEmail('admin@karthik.com');
      setPassword('admin123');
    } else {
      setEmail('user@karthik.com');
      setPassword('user123');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 mb-4 shadow-lg shadow-orange-200">
            <UtensilsCrossed className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">MenuMix</h1>
          <p className="text-sm text-stone-500 mt-1">Multilingual restaurant menus</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-7 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900 mb-5">Sign in</h2>

          {/* Demo pills — horizontal tag style, different from other projects */}
          <div className="flex items-center gap-2 mb-5 text-[11px]">
            <span className="text-stone-400 font-medium">DEMO:</span>
            <button
              type="button"
              onClick={() => demo('admin')}
              className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 font-medium transition-colors"
            >
              Admin Chef
            </button>
            <button
              type="button"
              onClick={() => demo('user')}
              className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 hover:bg-stone-200 font-medium transition-colors"
            >
              Diner
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg shadow-sm transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign in'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-stone-500">
            New here?{' '}
            <Link to="/register" className="font-semibold text-amber-700 hover:text-amber-800">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
