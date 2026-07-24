import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const KEY = 'storex-wishlist';

const readLocal = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } 
  catch { return []; }
};

const saveLocal = (items) => {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('wishlist-updated'));
};

export default function useWishlist() {
  const [items, setItems] = useState(readLocal);
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is logged in
  const isLoggedIn = () => {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (!authStorage) return false;
      const parsed = JSON.parse(authStorage);
      return !!parsed?.state?.token;
    } catch { return false; }
  };

  // Load from backend on mount (if logged in)
  useEffect(() => {
    if (!isLoggedIn()) {
      setItems(readLocal());
      return;
    }

    const fetchWishlist = async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/wishlist');
        const backendItems = Array.isArray(res.data) 
          ? res.data 
          : (res.data?.data || res.data?.items || []);

        const formatted = backendItems.map(item => ({
          id: item.product?.id || item.productId || item.id,
          name: item.product?.name || item.name,
          slug: item.product?.slug || item.slug,
          price: item.product?.price || item.price,
          comparePrice: item.product?.comparePrice || item.comparePrice,
          image: item.product?.images?.[0]?.url || item.image,
          category: item.product?.category?.name || item.category,
          wishlistId: item.id,
        })).filter(item => item.id);

        setItems(formatted);
        saveLocal(formatted);
      } catch (err) {
        console.warn('Backend wishlist fetch failed, using local:', err.message);
        setItems(readLocal());
      } finally {
        setIsLoading(false);
      }
    };

    fetchWishlist();
  }, []);

  // Sync when localStorage changes in other tabs
  useEffect(() => {
    const sync = () => setItems(readLocal());
    window.addEventListener('wishlist-updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('wishlist-updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const isWishlisted = useCallback((id) => {
    if (!id) return false;
    return items.some((i) => i.id === id);
  }, [items]);

  const toggle = useCallback(async (product) => {
    if (!product?.id) {
      console.error('useWishlist.toggle: product.id is required', product);
      return false;
    }

    const productId = product.id;

    // Check against CURRENT React state (not localStorage)
    const exists = items.some((i) => i.id === productId);

    let next;
    if (exists) {
      // REMOVE
      next = items.filter((i) => i.id !== productId);
    } else {
      // ADD
      next = [...items, { 
        id: productId, 
        name: product.name, 
        slug: product.slug, 
        price: product.price, 
        comparePrice: product.comparePrice, 
        image: product.images?.[0]?.url || product.image, 
        category: product.category?.name || product.category
      }];
    }

    // Update state immediately (optimistic)
    setItems(next);
    saveLocal(next);

    // Sync with backend if logged in
    if (isLoggedIn()) {
      try {
        if (exists) {
          await api.delete(`/wishlist/${productId}`);
        } else {
          await api.post('/wishlist', { productId: productId });
        }
      } catch (err) {
        console.error('Backend wishlist sync failed:', err.message);
        // Revert on error
        setItems(items);
        saveLocal(items);
        return exists; // Return original state on error
      }
    }

    // Return true if item was ADDED, false if REMOVED
    return !exists;
  }, [items]);

  const remove = useCallback(async (id) => {
    if (!id) return;

    const next = items.filter((i) => i.id !== id);
    setItems(next);
    saveLocal(next);

    if (isLoggedIn()) {
      try {
        await api.delete(`/wishlist/${id}`);
      } catch (err) {
        console.error('Backend wishlist remove failed:', err.message);
        setItems(items);
        saveLocal(items);
      }
    }
  }, [items]);

  return { items, count: items.length, isWishlisted, toggle, remove, isLoading };
}