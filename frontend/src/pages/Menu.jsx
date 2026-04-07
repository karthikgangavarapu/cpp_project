import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Volume2, Globe2, Loader2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import * as api from '../api.js';

export default function Menu() {
  const { id } = useParams();
  const navigate = useNavigate();
  const audioRef = useRef(null);

  const [restaurant, setRestaurant] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [lang, setLang] = useState('en');
  const [loading, setLoading] = useState(true);
  const [translations, setTranslations] = useState({}); // { dishId: { name, description, language } }
  const [translatingAll, setTranslatingAll] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [rRes, dRes, lRes] = await Promise.all([
          api.getRestaurant(id),
          api.getDishes(id),
          api.getLanguages(),
        ]);
        setRestaurant(rRes.data);
        setDishes(dRes.data || []);
        setLanguages(lRes.data || []);
      } catch {
        toast.error('Failed to load menu');
        navigate('/');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  // When lang changes to non-en, fetch translations for each dish in parallel
  useEffect(() => {
    if (!dishes.length) return;
    if (lang === 'en') {
      setTranslations({});
      return;
    }
    setTranslatingAll(true);
    Promise.all(
      dishes.map((d) => api.translateDish(d.id, lang).then((r) => [d.id, r.data]).catch(() => null))
    ).then((results) => {
      const map = {};
      for (const entry of results) {
        if (!entry) continue;
        const [dishId, t] = entry;
        map[dishId] = t;
      }
      setTranslations(map);
    }).finally(() => setTranslatingAll(false));
  }, [lang, dishes]);

  const handleSpeak = async (dish) => {
    setSpeakingId(dish.id);
    try {
      const r = await api.speakDish(dish.id, lang);
      if (r.data.audio_url) {
        if (audioRef.current) {
          audioRef.current.src = r.data.audio_url;
          audioRef.current.play();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Speech synthesis failed');
    } finally {
      setSpeakingId(null);
    }
  };

  if (loading) return <div className="skeleton h-40 rounded-xl" />;
  if (!restaurant) return null;

  const rtl = languages.find((l) => l.code === lang)?.rtl;
  const categories = [...new Set(dishes.map((d) => d.category))];

  return (
    <div dir={rtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-stone-900">{restaurant.name}</h1>
          <p className="text-sm text-stone-500 flex items-center gap-1.5 mt-0.5">
            {restaurant.address && (<><MapPin className="w-3.5 h-3.5" /> {restaurant.address}</>)}
          </p>
        </div>
      </div>

      {/* Language switcher pill bar */}
      <div className="bg-white rounded-xl border border-stone-200 p-3 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Globe2 className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Display language</span>
          {translatingAll && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 ml-2" />}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
                lang === l.code
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {l.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu grouped by category */}
      {categories.map((cat) => {
        const items = dishes.filter((d) => d.category === cat);
        return (
          <div key={cat} className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-3 border-b border-amber-200 pb-2">{cat}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((d) => {
                const t = translations[d.id];
                const name = t?.name || d.name;
                const description = t?.description || d.description;
                return (
                  <div key={d.id} className="bg-white rounded-xl border border-stone-200 p-4 flex gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-stone-900 text-sm">{name}</h3>
                        <span className="text-sm font-bold text-amber-700 whitespace-nowrap">
                          {restaurant.currency || 'EUR'} {Number(d.price).toFixed(2)}
                        </span>
                      </div>
                      {description && (
                        <p className="text-xs text-stone-500 mt-1 leading-relaxed">{description}</p>
                      )}
                      {d.allergens?.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                          <AlertTriangle className="w-3 h-3 text-orange-500" />
                          {d.allergens.map((a) => (
                            <span key={a} className="text-[9px] uppercase tracking-wider bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleSpeak(d)}
                      disabled={speakingId === d.id}
                      title={`Listen in ${languages.find((l) => l.code === lang)?.name || 'English'}`}
                      className="shrink-0 w-9 h-9 rounded-full bg-amber-50 hover:bg-amber-100 flex items-center justify-center text-amber-700 transition-colors disabled:opacity-50"
                    >
                      {speakingId === d.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Volume2 className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <audio ref={audioRef} className="hidden" />

      {dishes.length === 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-500">
          No dishes on this menu yet.
        </div>
      )}
    </div>
  );
}
