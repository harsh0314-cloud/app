import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Search, X, Plus } from 'lucide-react';

// Unsplash API - no key needed for demo, but for production get one from unsplash.com/developers
const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY || '';

export default function AddProduct() {
  const [form, setForm] = useState({ 
    name: '', 
    slug: '', 
    price: '', 
    description: '', 
    categoryId: '', 
    brandId: '',
    images: []
  });
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  // Unsplash image search
  const [searchQuery, setSearchQuery] = useState('');
  const [unsplashImages, setUnsplashImages] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);

  // Fetch categories and brands when the page loads
  useEffect(() => {
    api.get('/admin/categories').then(res => setCategories(res.data.categories || [])).catch(() => {});
    api.get('/admin/brands').then(res => setBrands(res.data.brands || [])).catch(() => {});
  }, []);

  // Search Unsplash images
  const searchUnsplash = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      // If no API key, use a fallback demo approach
      if (!UNSPLASH_ACCESS_KEY) {
        // Fallback: use curated photos endpoint (no key needed for limited access)
        const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=12&client_id=YOUR_ACCESS_KEY`);
        if (!res.ok) {
          // If API fails, show demo images
          setUnsplashImages([
            { id: 'demo1', urls: { small: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300', regular: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600' }, alt_description: 'T-shirt' },
            { id: 'demo2', urls: { small: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=300', regular: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600' }, alt_description: 'Clothing' },
            { id: 'demo3', urls: { small: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=300', regular: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600' }, alt_description: 'Fashion' },
            { id: 'demo4', urls: { small: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=300', regular: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=600' }, alt_description: 'Apparel' },
            { id: 'demo5', urls: { small: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=300', regular: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600' }, alt_description: 'Wear' },
            { id: 'demo6', urls: { small: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=300', regular: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600' }, alt_description: 'Style' },
          ]);
          toast.info('Add your Unsplash API key for real image search. Using demo images for now.');
          setSearching(false);
          return;
        }
        const data = await res.json();
        setUnsplashImages(data.results || []);
      } else {
        const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=12&client_id=${UNSPLASH_ACCESS_KEY}`);
        const data = await res.json();
        setUnsplashImages(data.results || []);
      }
    } catch (error) {
      toast.error('Failed to search images');
    } finally {
      setSearching(false);
    }
  };

  // Toggle image selection
  const toggleImage = (image) => {
    const isSelected = selectedImages.find(img => img.id === image.id);
    if (isSelected) {
      setSelectedImages(prev => prev.filter(img => img.id !== image.id));
    } else {
      if (selectedImages.length >= 5) {
        toast.error('Maximum 5 images allowed');
        return;
      }
      setSelectedImages(prev => [...prev, image]);
    }
  };

  // Remove selected image
  const removeImage = (imageId) => {
    setSelectedImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.categoryId || !form.brandId) {
      return toast.error("Please select a Category and Brand");
    }
    if (selectedImages.length === 0) {
      return toast.error("Please select at least one image");
    }
    setLoading(true);
    try {
      const images = selectedImages.map((img, idx) => ({
        url: img.urls.regular,
        isPrimary: idx === 0
      }));

      await api.post('/admin/products', { ...form, images });
      toast.success('Product created successfully!');
      setForm({ name: '', slug: '', price: '', description: '', categoryId: '', brandId: '', images: [] });
      setSelectedImages([]);
      setSearchQuery('');
      setUnsplashImages([]);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-8">Add New Product</h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border rounded-2xl p-8">

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Product Name</label>
          <input type="text" required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-foreground" placeholder="e.g. Wireless Headphones" />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Slug (URL)</label>
          <input type="text" required value={form.slug} onChange={(e) => setForm({...form, slug: e.target.value})} className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-foreground" placeholder="e.g. wireless-headphones" />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Price (₹)</label>
          <input type="number" required step="0.01" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-foreground" placeholder="199.99" />
        </div>

        {/* Category Dropdown */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Category</label>
          <select 
            required 
            value={form.categoryId} 
            onChange={(e) => setForm({...form, categoryId: e.target.value})} 
            className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-foreground"
          >
            <option value="">Select a category...</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Brand Dropdown */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Brand</label>
          <select 
            required 
            value={form.brandId} 
            onChange={(e) => setForm({...form, brandId: e.target.value})} 
            className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-foreground"
          >
            <option value="">Select a brand...</option>
            {brands.map(brand => (
              <option key={brand.id} value={brand.id}>{brand.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Description</label>
          <textarea rows={4} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-foreground" placeholder="Product details..." />
        </div>

        {/* Image Search Section */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-foreground mb-1">Product Images (from Unsplash)</label>

          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchUnsplash())}
                placeholder="Search images (e.g. tshirt, shoes, watch)..."
                className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border rounded-xl text-foreground"
              />
            </div>
            <button 
              type="button"
              onClick={searchUnsplash}
              disabled={searching || !searchQuery.trim()}
              className="px-4 py-2.5 bg-foreground text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {searching ? 'Searching...' : <><Search size={16} /> Search</>}
            </button>
          </div>

          {/* Selected Images Preview */}
          {selectedImages.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Selected Images ({selectedImages.length}/5):</p>
              <div className="flex gap-3 flex-wrap">
                {selectedImages.map((img) => (
                  <div key={img.id} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-gold">
                    <img src={img.urls.small} alt={img.alt_description} className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Results Grid */}
          {unsplashImages.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {unsplashImages.map((image) => {
                const isSelected = selectedImages.find(img => img.id === image.id);
                return (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => toggleImage(image)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      isSelected ? 'border-gold ring-2 ring-gold' : 'border-border hover:border-foreground'
                    }`}
                  >
                    <img 
                      src={image.urls.small} 
                      alt={image.alt_description} 
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-gold/20 flex items-center justify-center">
                        <div className="w-6 h-6 bg-gold rounded-full flex items-center justify-center text-white text-xs font-bold">
                          ✓
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Demo notice */}
          {!UNSPLASH_ACCESS_KEY && (
            <p className="text-xs text-muted-foreground">
              Using demo images. For real Unsplash search, add your API key to .env: 
              <code className="bg-muted px-1 rounded">VITE_UNSPLASH_ACCESS_KEY=your_key</code>
            </p>
          )}
        </div>

        <button type="submit" disabled={loading} className="w-full py-3 bg-foreground text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50">
          {loading ? 'Creating...' : 'Add Product'}
        </button>
      </form>
    </div>
  );
}