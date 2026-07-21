import { create } from 'zustand';
import api from '../services/api';
import useAuthStore from './authStore';

const readToken = () => {
  try { return JSON.parse(localStorage.getItem('auth-storage') || 'null')?.state?.token; }
  catch { return null; }
};

export const useCartStore = create((set, get) => ({
  items: [],
  savedItems: [],
  total: 0,

  // Ensure there is a session (creates an anonymous guest session if needed)
  ensureSession: async () => {
    if (readToken()) return;
    const res = await api.post('/auth/guest');
    const { token, refreshToken, user } = res.data;
    useAuthStore.setState({ token, refreshToken, user, isAuthenticated: true });
    const cur = JSON.parse(localStorage.getItem('auth-storage') || 'null') || { state: {}, version: 0 };
    cur.state = { ...cur.state, token, refreshToken, user, isAuthenticated: true };
    localStorage.setItem('auth-storage', JSON.stringify(cur));
  },

  fetchCart: async () => {
    try {
      const res = await api.get('/cart');
      const cartItems = res.data.cart.items || [];
      const active = cartItems.filter((i) => !i.savedForLater);
      const saved = cartItems.filter((i) => i.savedForLater);
      const total = active.reduce((sum, item) => sum + (parseFloat(item.product.price) * item.quantity), 0);
      set({ items: active, savedItems: saved, total });
    } catch (error) {
      console.error("Failed to fetch cart", error);
    }
  },

  addToCart: async (productId, quantity = 1) => {
    try {
      await get().ensureSession();
      await api.post('/cart', { productId, quantity });
      get().fetchCart();
    } catch (error) {
      console.error("Failed to add to cart", error);
      throw error;
    }
  },

  updateQuantity: async (itemId, newQuantity) => {
    try {
      await api.patch(`/cart/${itemId}`, { quantity: newQuantity });
      get().fetchCart();
    } catch (error) {
      console.error("Failed to update quantity", error);
    }
  },

  removeItem: async (itemId) => {
    try {
      await api.delete(`/cart/${itemId}`);
      get().fetchCart();
    } catch (error) {
      console.error("Failed to remove item", error);
    }
  },

  toggleSave: async (itemId) => {
    try {
      await api.patch(`/cart/${itemId}/save`);
      get().fetchCart();
    } catch (error) {
      console.error("Failed to update item", error);
    }
  },

  clearCart: async () => {
    try {
      await api.delete('/cart/clear');
      set({ items: [], savedItems: [], total: 0 });
    } catch (error) {
      console.error("Failed to clear cart", error);
    }
  }
}));

export default useCartStore;
