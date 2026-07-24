const KEY = 'storex-recently-viewed';
export const getRecentlyViewed = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
export const pushRecentlyViewed = (product) => {
  if (!product?.id) return;
  const entry = { id: product.id, name: product.name, slug: product.slug, price: product.price, comparePrice: product.comparePrice, image: product.images?.[0]?.url, category: product.category?.name };
  const prev = getRecentlyViewed().filter((p) => p.id !== product.id);
  localStorage.setItem(KEY, JSON.stringify([entry, ...prev].slice(0, 8)));
};