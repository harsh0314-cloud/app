import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion }  from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import useProducts from '../hooks/useProducts';
import ProductCard from '../components/ProductCard';

const CATS = [
  { label: 'All', slug: '' },
  { label: 'Hoodies', slug: 'hoodies' },
  { label: 'T-Shirts', slug: 't-shirts' },
  { label: 'Jackets', slug: 'jackets' },
  { label: 'Trousers', slug: 'trousers' },
  { label: 'Footwear', slug: 'footwear' },
  { label: 'Accessories', slug: 'accessories' },
];

const SORTS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Price ↑', value: 'price-asc' },
  { label: 'Price ↓', value: 'price-desc' },
];

export default function Products() {
  const { products, loading, pagination, filters, updateFilter, setPage } = useProducts();
  const [searchParams, setSearchParams] = useSearchParams();

  // Sync URL params -> filters
  useEffect(() => {
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const sort = searchParams.get('sort') || 'newest';
    if (search !== filters.search) updateFilter('search', search);
    if (category !== filters.category) updateFilter('category', category);
    if (sort !== filters.sort) updateFilter('sort', sort);
    // eslint-disable-next-line
  }, [searchParams]);

  const setCategory = (slug) => {
    const next = new URLSearchParams(searchParams);
    slug ? next.set('category', slug) : next.delete('category');
    setSearchParams(next);
  };
  const setSort = (value) => {
    const next = new URLSearchParams(searchParams);
    next.set('sort', value);
    setSearchParams(next);
  };
  const clearSearch = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('search');
    setSearchParams(next);
  };

  const activeSearch = searchParams.get('search') || '';
  const activeCat = searchParams.get('category') || '';
  const activeSort = searchParams.get('sort') || 'newest';

  return (
    <div className="bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="container-luxe py-14 md:py-20">
          <p className="overline text-muted-foreground">{pagination.total || 0} Pieces</p>
          <h1 className="mt-3 font-display text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            {activeSearch ? `“${activeSearch}”` : 'The Collection'}
          </h1>
          {activeSearch && (
            <button onClick={clearSearch} data-testid="clear-search" className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-luxe-sm text-muted-foreground hover:text-foreground">
              Clear search <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="sticky top-16 z-30 border-b border-border bg-white/85 backdrop-blur-xl lg:top-20">
        <div className="container-luxe flex items-center justify-between gap-4 overflow-x-auto py-4 no-scrollbar">
          <div className="flex items-center gap-1">
            {CATS.map((c) => (
              <button
                key={c.slug || 'all'}
                onClick={() => setCategory(c.slug)}
                data-testid={`filter-${c.slug || 'all'}`}
                className={`whitespace-nowrap px-4 py-2 text-[11px] font-semibold uppercase tracking-luxe-sm transition-colors ${activeCat === c.slug ? 'bg-foreground text-white' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-1 border-l border-border pl-3">
            {SORTS.map((s) => (
              <button
                key={s.value}
                onClick={() => setSort(s.value)}
                data-testid={`sort-${s.value}`}
                className={`whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-luxe-sm transition-colors ${activeSort === s.value ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="container-luxe py-14 md:py-20">
        {loading ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => <div key={i} className="aspect-[4/5] animate-pulse bg-surface" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="py-24 text-center">
            <h2 className="font-display text-2xl font-bold">Nothing here yet</h2>
            <p className="mt-2 text-muted-foreground">Try a different category or search.</p>
            <button onClick={() => setSearchParams({})} className="mt-6 border border-foreground px-8 py-3 text-[11px] font-semibold uppercase tracking-luxe-sm transition-colors hover:bg-foreground hover:text-white">Reset</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
              {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>

            {pagination.totalPages > 1 && (
              <div className="mt-20 flex items-center justify-center gap-2">
                <button onClick={() => setPage(pagination.page - 1)} disabled={pagination.page === 1} data-testid="page-prev" className="flex h-11 w-11 items-center justify-center border border-border transition-colors hover:bg-foreground hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground">
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((n) => (
                  <button key={n} onClick={() => setPage(n)} data-testid={`page-${n}`} className={`h-11 w-11 text-sm font-semibold transition-colors ${pagination.page === n ? 'bg-foreground text-white' : 'border border-border hover:bg-surface'}`}>{n}</button>
                ))}
                <button onClick={() => setPage(pagination.page + 1)} disabled={pagination.page === pagination.totalPages} data-testid="page-next" className="flex h-11 w-11 items-center justify-center border border-border transition-colors hover:bg-foreground hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground">
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
