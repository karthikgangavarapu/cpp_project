import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, X, Shield, Check, Eye } from 'lucide-react';
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
  const [editingDish, setEditingDish] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [previewDish, setPreviewDish] = useState(null);
  const [editingRest, setEditingRest] = useState(null);
  const [editRestForm, setEditRestForm] = useState({ name: '', cuisine: '', address: '', description: '' });

  const handleEditRestStart = (r) => {
    setEditingRest(r.id);
    setEditRestForm({ name: r.name, cuisine: r.cuisine || '', address: r.address || '', description: r.description || '' });
  };

  const handleEditRestSave = async () => {
    setSaving(true);
    try {
      await api.updateRestaurant(editingRest, { ...editRestForm, currency: 'EUR', default_language: 'en' });
      toast.success('Restaurant updated');
      setEditingRest(null);
      loadRestaurants();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update restaurant');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRest = async (id, name) => {
    if (!confirm(`Delete "${name}"? All its dishes will also be removed.`)) return;
    try {
      await api.deleteRestaurant(id);
      toast.success('Restaurant deleted');
      if (selectedId === id) setSelectedId(null);
      loadRestaurants();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete restaurant');
    }
  };

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
      const allergens = dishForm.allergens.split(',').map((s) => s.trim()).filter(Boolean);
      await api.createDish(selectedId, {
        name: dishForm.name, description: dishForm.description,
        price: parseFloat(dishForm.price) || 0, category: dishForm.category, allergens,
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

  const handleEditStart = (d) => {
    setEditingDish(d.id);
    setEditForm({
      name: d.name, description: d.description || '',
      price: d.price, category: d.category || 'Main',
      allergens: (d.allergens || []).join(', '),
    });
  };

  const handleEditSave = async (id) => {
    setSaving(true);
    try {
      const allergens = editForm.allergens.split(',').map((s) => s.trim()).filter(Boolean);
      await api.updateDish(id, {
        name: editForm.name, description: editForm.description,
        price: parseFloat(editForm.price) || 0, category: editForm.category, allergens,
      });
      toast.success('Dish updated');
      setEditingDish(null);
      loadDishes(selectedId);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update dish');
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
          <button onClick={() => { setShowRestForm(!showRestForm); setEditingRest(null); }} className="text-xs font-medium text-amber-600 hover:text-amber-700">
            {showRestForm ? 'Cancel' : '+ New Restaurant'}
          </button>
        </div>
        {showRestForm ? (
          <form onSubmit={handleAddRestaurant} className="space-y-3 mt-3 pt-3 border-t border-stone-100">
            <input value={restForm.name} onChange={(e) => setRestForm({ ...restForm, name: e.target.value })} required placeholder="Restaurant name"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
            <div className="grid grid-cols-2 gap-3">
              <input value={restForm.cuisine} onChange={(e) => setRestForm({ ...restForm, cuisine: e.target.value })} placeholder="Cuisine (e.g. Italian)"
                className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
              <input value={restForm.address} onChange={(e) => setRestForm({ ...restForm, address: e.target.value })} placeholder="Address"
                className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
            </div>
            <textarea value={restForm.description} onChange={(e) => setRestForm({ ...restForm, description: e.target.value })} rows={2} placeholder="Description"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
            <button type="submit" disabled={saving} className="w-full bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Restaurant'}
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <select value={selectedId || ''} onChange={(e) => setSelectedId(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500">
              {restaurants.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
            </select>

            {selectedId && !editingRest && (
              <div className="flex gap-2">
                <button onClick={() => handleEditRestStart(restaurants.find((r) => r.id === selectedId))}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors">
                  <Pencil className="w-3.5 h-3.5" /> Edit Restaurant
                </button>
                <button onClick={() => handleDeleteRest(selectedId, restaurants.find((r) => r.id === selectedId)?.name)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}

            {editingRest && (
              <div className="space-y-3 pt-3 border-t border-stone-100">
                <input value={editRestForm.name} onChange={(e) => setEditRestForm({ ...editRestForm, name: e.target.value })} placeholder="Restaurant name"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={editRestForm.cuisine} onChange={(e) => setEditRestForm({ ...editRestForm, cuisine: e.target.value })} placeholder="Cuisine"
                    className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
                  <input value={editRestForm.address} onChange={(e) => setEditRestForm({ ...editRestForm, address: e.target.value })} placeholder="Address"
                    className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
                </div>
                <textarea value={editRestForm.description} onChange={(e) => setEditRestForm({ ...editRestForm, description: e.target.value })} rows={2} placeholder="Description"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
                <div className="flex gap-2">
                  <button onClick={handleEditRestSave} disabled={saving}
                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
                    <Check className="w-4 h-4" /> Save
                  </button>
                  <button onClick={() => setEditingRest(null)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-stone-100 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-200">
                    <X className="w-4 h-4" /> Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dishes table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
          <h2 className="font-semibold text-stone-900">Dishes ({dishes.length})</h2>
          <button onClick={() => setShowDishModal(true)} disabled={!selectedId}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg disabled:opacity-50">
            <Plus className="w-4 h-4" /> Add dish
          </button>
        </div>
        {dishes.length === 0 ? (
          <div className="p-8 text-center text-stone-400 text-sm">No dishes. Add one above.</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {dishes.map((d) => (
              <div key={d.id} className="px-5 py-3">
                {editingDish === d.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" placeholder="Name" />
                      <div className="flex gap-2">
                        <input type="number" step="0.01" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                          className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" placeholder="Price" />
                        <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500">
                          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" placeholder="Description" />
                    <input value={editForm.allergens} onChange={(e) => setEditForm({ ...editForm, allergens: e.target.value })} placeholder="Allergens (comma-separated)"
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
                    <div className="flex gap-2">
                      <button onClick={() => handleEditSave(d.id)} disabled={saving}
                        className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
                        <Check className="w-4 h-4" /> Save
                      </button>
                      <button onClick={() => setEditingDish(null)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-stone-100 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-200">
                        <X className="w-4 h-4" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-stone-900 text-sm">{d.name}</span>
                        <span className="text-[10px] uppercase tracking-wider text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">{d.category}</span>
                        {d.allergens?.length > 0 && (
                          <span className="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">{d.allergens.length} allergen{d.allergens.length > 1 ? 's' : ''}</span>
                        )}
                      </div>
                      {d.description && (<p className="text-xs text-stone-500 mt-0.5 truncate">{d.description}</p>)}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-sm font-bold text-amber-700">EUR {Number(d.price).toFixed(2)}</span>
                      <button onClick={() => setPreviewDish(d)} className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Preview">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEditStart(d)} className="p-1.5 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteDish(d.id)} className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview modal */}
      {previewDish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setPreviewDish(null)} />
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 w-full max-w-md relative z-10">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <h2 className="font-semibold text-stone-900">Dish Preview</h2>
              <button onClick={() => setPreviewDish(null)} className="text-stone-400 hover:text-stone-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-xl font-bold text-stone-900">{previewDish.name}</h3>
                <span className="text-xs uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-1 inline-block">{previewDish.category}</span>
              </div>
              {previewDish.description && <p className="text-sm text-stone-600 leading-relaxed">{previewDish.description}</p>}
              <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                <span className="text-2xl font-bold text-amber-700">EUR {Number(previewDish.price).toFixed(2)}</span>
              </div>
              {previewDish.allergens?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Allergens</p>
                  <div className="flex flex-wrap gap-1">
                    {previewDish.allergens.map((a) => (
                      <span key={a} className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded">{a}</span>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => { setPreviewDish(null); handleEditStart(previewDish); }}
                className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg">
                <Pencil className="w-4 h-4" /> Edit this dish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Dish modal */}
      {showDishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowDishModal(false)} />
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 w-full max-w-md relative z-10">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <h2 className="font-semibold text-stone-900">Add new dish</h2>
              <button onClick={() => setShowDishModal(false)} className="text-stone-400 hover:text-stone-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddDish} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1 uppercase tracking-wider">Name</label>
                <input value={dishForm.name} onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })} required
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1 uppercase tracking-wider">Description</label>
                <textarea value={dishForm.description} onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })} rows={2}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1 uppercase tracking-wider">Price (EUR)</label>
                  <input type="number" step="0.01" min="0" value={dishForm.price} onChange={(e) => setDishForm({ ...dishForm, price: e.target.value })} required
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1 uppercase tracking-wider">Category</label>
                  <select value={dishForm.category} onChange={(e) => setDishForm({ ...dishForm, category: e.target.value })}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1 uppercase tracking-wider">Allergens (comma-separated)</label>
                <input value={dishForm.allergens} onChange={(e) => setDishForm({ ...dishForm, allergens: e.target.value })} placeholder="gluten, dairy, nuts"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowDishModal(false)} className="px-4 py-2 text-sm font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50">
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
