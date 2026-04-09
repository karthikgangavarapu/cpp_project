import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, X, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import * as api from '../api.js';

const CATEGORIES = ['Starter', 'Main', 'Side', 'Dessert', 'Drink', 'Special'];

export default function Admin() {
  const [restaurants, setRestaurants] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDishModal, setShowDishModal] = useState(false);
  const [dishForm, setDishForm] = useState({ name: '', description: '', price: '', category: 'Main', allergens: '' });
  const [saving, setSaving] = useState(false);
  const [showRestForm, setShowRestForm] = useState(false);
  const [restForm, setRestForm] = useState({ name: '', cuisine: '', address: '', description: '' });

  const handleAddRestaurant = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createRestaurant({ ...restForm, currency: 'EUR', default_language: 'en' });
      toast.success('Restaurant created');
      setShowRestForm(false);
      setRestForm({ name: '', cuisine: '', address: '', description: '' });
      loadRestaurants();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create restaurant');
    } finally {
      setSaving(false);
    }
  };

  const loadRestaurants = async () => {
    try {
      const r = await api.getRestaurants();
      setRestaurants(r.data || []);
      if (!selectedId && r.data?.length) setSelectedId(r.data[0].id);
    } catch {
      toast.error('Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  };

  const loadDishes = async (rid) => {
    if (!rid) return;
    try {
      const r = await api.getDishes(rid);
      setDishes(r.data || []);
    } catch {
      toast.error('Failed to load dishes');
    }
  };

  useEffect(() => { loadRestaurants(); }, []);
  useEffect(() => { loadDishes(selectedId); }, [selectedId]);

  const handleAddDish = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const allergens = dishForm.allergens
        .split(',').map((s) => s.trim()).filter(Boolean);
      await api.createDish(selectedId, {
        name: dishForm.name,
        description: dishForm.description,
        price: parseFloat(dishForm.price) || 0,
        category: dishForm.category,
        allergens,
      });
      toast.success('Dish added');
      setShowDishModal(false);
      setDishForm({ name: '', description: '', price: '', category: 'Main', allergens: '' });
      loadDishes(selectedId);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add dish');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDish = async (id) => {
    if (!confirm('Delete this dish?')) return;
    try {
      await api.deleteDish(id);
      toast.success('Dish deleted');
      loadDishes(selectedId);
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (loading) return <div className="skeleton h-64 rounded-xl" />;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-5 h-5 text-amber-600" />
        <h1 className="text-2xl font-bold text-stone-900">Admin — Menu Management</h1>
      </div>

      {/* Restaurant selector + create */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider">Managing restaurant</label>
          <button
            onClick={() => setShowRestForm(!showRestForm)}
            className="text-xs font-medium text-amber-600 hover:text-amber-700"
          >
            {showRestForm ? 'Cancel' : '+ New Restaurant'}
          </button>
        </div>
        {showRestForm ? (
          <form onSubmit={handleAddRestaurant} className="space-y-3 mt-3 pt-3 border-t border-stone-100">
            <input
              value={restForm.name} onChange={(e) => setRestForm({ ...restForm, name: e.target.value })}
              required placeholder="Restaurant name"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                value={restForm.cuisine} onChange={(e) => setRestForm({ ...restForm, cuisine: e.target.value })}
                placeholder="Cuisine (e.g. Italian)"
                className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
              <input
                value={restForm.address} onChange={(e) => setRestForm({ ...restForm, address: e.target.value })}
                placeholder="Address"
                className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
            <textarea
              value={restForm.description} onChange={(e) => setRestForm({ ...restForm, description: e.target.value })}
              rows={2} placeholder="Description"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
            <button type="submit" disabled={saving}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Restaurant'}
            </button>
          </form>
        ) : (
          <select
            value={selectedId || ''}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          >
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Dishes table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
          <h2 className="font-semibold text-stone-900">Dishes ({dishes.length})</h2>
          <button
            onClick={() => setShowDishModal(true)}
            disabled={!selectedId}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Add dish
          </button>
        </div>
        {dishes.length === 0 ? (
          <div className="p-8 text-center text-stone-400 text-sm">No dishes. Add one above.</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {dishes.map((d) => (
              <div key={d.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-stone-900 text-sm">{d.name}</span>
                    <span className="text-[10px] uppercase tracking-wider text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">{d.category}</span>
                  </div>
                  {d.description && (
                    <p className="text-xs text-stone-500 mt-0.5 truncate">{d.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="text-sm font-bold text-amber-700">EUR {Number(d.price).toFixed(2)}</span>
                  <button
                    onClick={() => handleDeleteDish(d.id)}
                    className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Dish modal */}
      {showDishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowDishModal(false)} />
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 w-full max-w-md relative z-10">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <h2 className="font-semibold text-stone-900">Add new dish</h2>
              <button onClick={() => setShowDishModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddDish} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1 uppercase tracking-wider">Name</label>
                <input
                  value={dishForm.name}
                  onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
                  required
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1 uppercase tracking-wider">Description</label>
                <textarea
                  value={dishForm.description}
                  onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })}
                  rows={2}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1 uppercase tracking-wider">Price (EUR)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={dishForm.price}
                    onChange={(e) => setDishForm({ ...dishForm, price: e.target.value })}
                    required
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1 uppercase tracking-wider">Category</label>
                  <select
                    value={dishForm.category}
                    onChange={(e) => setDishForm({ ...dishForm, category: e.target.value })}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1 uppercase tracking-wider">Allergens (comma-separated)</label>
                <input
                  value={dishForm.allergens}
                  onChange={(e) => setDishForm({ ...dishForm, allergens: e.target.value })}
                  placeholder="gluten, dairy, nuts"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDishModal(false)}
                  className="px-4 py-2 text-sm font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Add dish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
