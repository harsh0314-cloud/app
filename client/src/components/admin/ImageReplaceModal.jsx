import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Upload, Trash2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY || '';

const DEMO = [
  { id: 'd1', url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600', thumb: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300' },
  { id: 'd2', url: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600', thumb: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=300' },
  { id: 'd3', url: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600', thumb: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=300' },
  { id: 'd4', url: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=600', thumb: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=300' },
  { id: 'd5', url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600', thumb: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=300' },
  { id: 'd6', url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600', thumb: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=300' },
];

// Lightweight overlay for replacing a product's primary image. Supports BOTH
// Unsplash search and Cloudinary upload. Returns the chosen secure URL via onSelect.
export default function ImageReplaceModal({ currentImage, onClose, onSelect, onClear }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [picked, setPicked] = useState('');

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      if (!UNSPLASH_ACCESS_KEY) {
        setResults(DEMO.map((d) => ({ id: d.id, url: d.url, thumb: d.thumb })));
        toast('Showing demo images. Add VITE_UNSPLASH_ACCESS_KEY for live search.');
      } else {
        const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12&client_id=${UNSPLASH_ACCESS_KEY}`);
        const data = await res.json();
        setResults((data.results || []).map((r) => ({ id: r.id, url: r.urls.regular, thumb: r.urls.small })));
      }
    } catch {
      toast.error('Image search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('images', file);
      const res = await api.post('/admin/upload', fd);
      const url = res.data?.images?.[0]?.url || res.data?.data?.images?.[0]?.url;
      if (url) {
        setPicked(url);
        toast.success('Uploaded to Cloudinary');
      } else {
        toast.error('Upload succeeded but no URL was returned');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const confirm = () => {
    if (!picked) return toast.error('Select or upload an image first');
    onSelect(picked);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" data-testid="image-replace-modal">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-lg">Replace Product Image</h3>
          <button onClick={onClose} data-testid="image-modal-close" className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
        </div>

        {/* Current + selected preview */}
        <div className="flex items-center gap-4 mb-5">
          <div className="text-center">
            <img src={currentImage || 'https://via.placeholder.com/80'} alt="current" className="w-20 h-20 rounded-lg object-cover border border-border" />
            <p className="text-[10px] text-muted-foreground mt-1">Current</p>
          </div>
          <span className="text-muted-foreground">→</span>
          <div className="text-center">
            <img src={picked || 'https://via.placeholder.com/80?text=New'} alt="new" className={`w-20 h-20 rounded-lg object-cover border-2 ${picked ? 'border-foreground' : 'border-dashed border-border'}`} />
            <p className="text-[10px] text-muted-foreground mt-1">New</p>
          </div>
        </div>

        {/* Method 1: Unsplash search */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              data-testid="image-modal-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), search())}
              placeholder="Search Unsplash (e.g. shoes, watch)..."
              className="w-full pl-9 pr-3 py-2.5 bg-muted border border-border rounded-xl text-sm"
            />
          </div>
          <button type="button" onClick={search} disabled={searching || !query.trim()} className="px-4 py-2.5 bg-foreground text-white rounded-xl text-sm font-medium disabled:opacity-50">
            {searching ? '...' : 'Search'}
          </button>
        </div>

        {results.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-4">
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setPicked(r.url)}
                className={`aspect-square rounded-lg overflow-hidden border-2 ${picked === r.url ? 'border-foreground ring-2 ring-foreground' : 'border-border'}`}
              >
                <img src={r.thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="h-px flex-1 bg-border" /><span className="text-xs text-muted-foreground uppercase">or</span><div className="h-px flex-1 bg-border" />
        </div>

        {/* Method 2: Upload → Cloudinary */}
        <label data-testid="image-modal-upload-label" className={`flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-foreground transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
          <Upload size={18} />
          <span className="text-sm font-medium">{uploading ? 'Uploading to Cloudinary...' : 'Upload from your computer'}</span>
          <input data-testid="image-modal-upload-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleUpload} disabled={uploading} className="hidden" />
        </label>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted">Cancel</button>
          <button data-testid="image-modal-save" onClick={confirm} disabled={!picked} className="flex-1 py-2.5 bg-foreground text-white rounded-xl text-sm font-semibold disabled:opacity-50">Use This Image</button>
        </div>

        {currentImage && onClear && (
          <button
            data-testid="image-modal-clear"
            onClick={() => { onClear(); onClose(); }}
            className="w-full mt-3 text-xs font-semibold text-red-500 hover:text-red-600 flex items-center justify-center gap-1.5"
          >
            <Trash2 size={13} /> Remove current image
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}
