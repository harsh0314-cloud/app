import { useState, useEffect } from 'react';
import api from '../services/api';

export default function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, page: 1 });
  
  // Filter & Sort State
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    brand: '',
    sort: 'newest',
    page: 1,
    limit: 6, // Show 6 products per page
  });

  // Fetch products whenever filters change
  useEffect(() => {
    // ONLY show loading skeletons when changing pages, NOT when typing in search/sort
    // This prevents the annoying UI blinking
    if (filters.page !== 1) {
      setLoading(true);
    }

    api.get('/products', { params: filters })
  .then((res) => {
    setProducts(res.data.products || []);
    setPagination(
      res.data.pagination || {
        total: res.data.total || 0,
        totalPages: res.data.totalPages || 1,
        page: res.data.page || 1,
      }
    );
  })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [filters]);

  // Helper functions to update filters easily
  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 })); // Reset to page 1 when filters change
  };

  const setPage = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top on page change
  };

  return { products, loading, pagination, filters, updateFilter, setPage };
}