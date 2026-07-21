import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowUpDown, AlertTriangle, CheckCircle, Save } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminInventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('low-stock');
  const [editingId, setEditingId] = useState(null);
  const [editQty, setEditQty] = useState('');
  const [bulkUpdates, setBulkUpdates] = useState({});

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await api.get('/admin/inventory');
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setInventory(data);
    } catch (err) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (id) => {
    try {
      await api.patch(`/admin/inventory/${id}`, { quantity: parseInt(editQty) });
      toast.success('Stock updated');
      setEditingId(null);
      fetchInventory();
    } catch (err) {
      toast.error(err.message || 'Failed to update stock');
    }
  };

  const handleBulkSave = async () => {
    const updates = Object.entries(bulkUpdates).map(([productId, quantity]) => ({
      productId,
      quantity: parseInt(quantity)
    }));

    if (updates.length === 0) {
      toast('No changes to save');
      return;
    }

    try {
      await api.post('/admin/inventory/bulk', { updates });
      toast.success('Bulk update saved');
      setBulkUpdates({});
      fetchInventory();
    } catch (err) {
      toast.error(err.message || 'Failed to bulk update');
    }
  };

  const handleBulkChange = (productId, value) => {
    setBulkUpdates(prev => ({ ...prev, [productId]: value }));
  };

  const filteredInventory = inventory
    .filter(item => item.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'low-stock') return (a.quantity || 0) - (b.quantity || 0);
      if (sortBy === 'high-stock') return (b.quantity || 0) - (a.quantity || 0);
      if (sortBy === 'name') return (a.product?.name || '').localeCompare(b.product?.name || '');
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

  const getStockStatus = (qty, threshold = 5) => {
    if (qty === 0) return { label: 'Out of Stock', class: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle };
    if (qty <= threshold) return { label: 'Low Stock', class: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle };
    return { label: 'In Stock', class: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle };
  };

  const hasBulkChanges = Object.keys(bulkUpdates).length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-display">Inventory Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and update product stock levels</p>
        </div>
        {hasBulkChanges && (
          <button 
            onClick={handleBulkSave}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            <Save size={16} />
            Save Changes ({Object.keys(bulkUpdates).length})
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Total Products</p>
          <p className="text-2xl font-bold mt-1">{inventory.length}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-sm text-red-600">Out of Stock</p>
          <p className="text-2xl font-bold mt-1 text-red-700">{inventory.filter(i => i.quantity === 0).length}</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <p className="text-sm text-amber-600">Low Stock</p>
          <p className="text-2xl font-bold mt-1 text-amber-700">{inventory.filter(i => i.quantity > 0 && i.quantity <= (i.lowStockThreshold || 5)).length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-foreground outline-none"
          />
        </div>
        <select 
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-foreground outline-none"
        >
          <option value="low-stock">Low Stock First</option>
          <option value="high-stock">High Stock First</option>
          <option value="name">Name A-Z</option>
          <option value="recent">Recently Updated</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading inventory...</div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Product</th>
                <th className="text-left px-4 py-3 font-semibold">Current Stock</th>
                <th className="text-left px-4 py-3 font-semibold">Threshold</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Update</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((item) => {
                const status = getStockStatus(item.quantity, item.lowStockThreshold);
                const StatusIcon = status.icon;
                const hasChange = bulkUpdates[item.productId] !== undefined;

                return (
                  <tr key={item.id} className={`border-b border-border last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${hasChange ? 'bg-blue-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img 
                          src={item.product?.images?.[0]?.url} 
                          alt={item.product?.name} 
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <div>
                          <p className="font-medium">{item.product?.name}</p>
                          <Link to={`/products/${item.product?.slug}`} className="text-xs text-blue-600 hover:underline">View Product</Link>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {editingId === item.id ? (
                        <input 
                          type="number" 
                          min="0"
                          value={editQty}
                          onChange={(e) => setEditQty(e.target.value)}
                          className="w-20 px-2 py-1 border border-border rounded text-sm"
                          autoFocus
                        />
                      ) : (
                        <span className="font-semibold">{item.quantity}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.lowStockThreshold || 5}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${status.class}`}>
                        <StatusIcon size={12} />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {editingId === item.id ? (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleUpdateStock(item.id)}
                            className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 border border-border text-xs rounded-lg hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input 
                            type="number"
                            min="0"
                            placeholder={item.quantity}
                            value={bulkUpdates[item.productId] || ''}
                            onChange={(e) => handleBulkChange(item.productId, e.target.value)}
                            className="w-20 px-2 py-1 border border-border rounded text-sm"
                          />
                          <button 
                            onClick={() => { setEditingId(item.id); setEditQty(item.quantity.toString()); }}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Quick edit"
                          >
                            <ArrowUpDown size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}