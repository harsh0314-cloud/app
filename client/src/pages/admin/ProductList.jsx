import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Edit2, Package, Search,} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({});

  const fetchProducts = () => {
    setLoading(true);
    api.get('/products?limit=100')
      .then((res) => {
        const data = res.data?.products || res.data?.data?.products || [];
        setProducts(data);
      })
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/admin/products/${id}`);
      toast.success('Product deleted');
      fetchProducts();
    } catch (error) {
      toast.error(error.message || 'Failed to delete product');
    }
  };

  const startEdit = (product) => {
    setEditingProduct(product.id);
    setEditForm({
      name: product.name,
      price: product.price,
      comparePrice: product.comparePrice || '',
      isActive: product.isActive,
      isNewArrival: product.isNewArrival,
      isBestSeller: product.isBestSeller,
      inventory: product.inventory?.quantity || 0
    });
  };

  const saveEdit = async (id) => {
    try {
      await api.patch(`/admin/products/${id}`, editForm);
      toast.success('Product updated');
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      toast.error(error.message || 'Failed to update product');
    }
  };

  const filteredProducts = products
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'price-asc') return parseFloat(a.price) - parseFloat(b.price);
      if (sortBy === 'price-desc') return parseFloat(b.price) - parseFloat(a.price);
      if (sortBy === 'stock-low') return (a.inventory?.quantity || 0) - (b.inventory?.quantity || 0);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const getStockStatus = (qty) => {
    if (qty === 0) return { label: 'Out of Stock', class: 'bg-red-100 text-red-700' };
    if (qty <= 5) return { label: 'Low Stock', class: 'bg-yellow-100 text-yellow-700' };
    return { label: 'In Stock', class: 'bg-green-100 text-green-700' };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-display">All Products</h1>
          <p className="text-sm text-muted-foreground mt-1">{products.length} products total</p>
        </div>
        <Link to="/admin/add-product" className="flex items-center gap-2 bg-foreground text-white px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity">
          <Package size={16} />
          Add Product
        </Link>
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
          <option value="newest">Newest</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="stock-low">Low Stock First</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading products...</div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Product</th>
                <th className="text-left px-4 py-3 font-semibold">Price</th>
                <th className="text-left px-4 py-3 font-semibold">Stock</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b border-border last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={product.images?.[0]?.url} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.category?.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {editingProduct === product.id ? (
                      <input 
                        type="number" 
                        value={editForm.price}
                        onChange={(e) => setEditForm({...editForm, price: e.target.value})}
                        className="w-24 px-2 py-1 border border-border rounded text-sm"
                      />
                    ) : (
                      <div>
                        <span className="font-semibold">₹{product.price}</span>
                        {product.comparePrice && <span className="text-xs text-muted-foreground line-through ml-2">₹{product.comparePrice}</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingProduct === product.id ? (
                      <input 
                        type="number" 
                        value={editForm.inventory}
                        onChange={(e) => setEditForm({...editForm, inventory: e.target.value})}
                        className="w-20 px-2 py-1 border border-border rounded text-sm"
                      />
                    ) : (
                      <div>
                        <span className="font-medium">{product.inventory?.quantity || 0}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ml-2 ${getStockStatus(product.inventory?.quantity || 0).class}`}>
                          {getStockStatus(product.inventory?.quantity || 0).label}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingProduct === product.id ? (
                      <div className="space-y-1">
                        <label className="flex items-center gap-2 text-xs">
                          <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({...editForm, isActive: e.target.checked})} />
                          Active
                        </label>
                        <label className="flex items-center gap-2 text-xs">
                          <input type="checkbox" checked={editForm.isNewArrival} onChange={(e) => setEditForm({...editForm, isNewArrival: e.target.checked})} />
                          New Arrival
                        </label>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        {product.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>}
                        {product.isNewArrival && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">New</span>}
                        {product.isBestSeller && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Best</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {editingProduct === product.id ? (
                        <>
                          <button onClick={() => saveEdit(product.id)} className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700">Save</button>
                          <button onClick={() => setEditingProduct(null)} className="px-3 py-1.5 border border-border text-xs rounded-lg hover:bg-gray-50">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(product)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Edit">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(product.id)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}