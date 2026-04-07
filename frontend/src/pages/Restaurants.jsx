import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, UtensilsCrossed, Globe2 } from 'lucide-react';
import toast from 'react-hot-toast';
import * as api from '../api.js';

export default function Restaurants() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRestaurants()
      .then((r) => setRestaurants(r.data || []))
      .catch(() => toast.error('Failed to load restaurants'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-40 rounded-xl" />)}
    </div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900">Discover restaurants</h1>
        <p className="text-stone-500 mt-1 flex items-center gap-1.5">
          <Globe2 className="w-4 h-4" />
          Browse menus translated into 8 languages, with voice playback.
        </p>
      </div>

      {restaurants.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
          <UtensilsCrossed className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500">No restaurants yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((r) => (
            <Link
              key={r.id}
              to={`/restaurants/${r.id}`}
              className="group bg-white rounded-xl border border-stone-200 p-6 hover:border-amber-400 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                  <UtensilsCrossed className="w-6 h-6 text-amber-700" />
                </div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-400 bg-stone-100 px-2 py-1 rounded-full">
                  {r.cuisine || 'Restaurant'}
                </span>
              </div>
              <h3 className="font-bold text-stone-900 text-lg group-hover:text-amber-700 transition-colors">{r.name}</h3>
              {r.description && (
                <p className="text-xs text-stone-500 mt-1 line-clamp-2">{r.description}</p>
              )}
              {r.address && (
                <div className="mt-3 pt-3 border-t border-stone-100 flex items-center gap-1.5 text-xs text-stone-500">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{r.address}</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
