// Reusable skeleton loaders for perceived-performance during data fetches.

export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-gray-200/70 dark:bg-gray-700/60 ${className}`} />
);

export const ProductCardSkeleton = () => (
  <div className="group">
    <div className="animate-pulse aspect-[4/5] w-full rounded-2xl bg-gray-200/70 dark:bg-gray-700/60" />
    <div className="mt-4 space-y-2">
      <div className="animate-pulse h-3 w-3/4 bg-gray-200/70 dark:bg-gray-700/60" />
      <div className="animate-pulse h-3 w-1/3 bg-gray-200/70 dark:bg-gray-700/60" />
    </div>
  </div>
);

export const ProductGridSkeleton = ({ count = 8 }) => (
  <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-5 md:grid-cols-3 md:gap-y-10 xl:grid-cols-5">
    {Array.from({ length: count }).map((_, i) => (
      <ProductCardSkeleton key={i} />
    ))}
  </div>
);

// Full-page fallback used by React.lazy Suspense boundaries.
export const PageSkeleton = () => (
  <div className="container-luxe py-20">
    <div className="animate-pulse h-8 w-56 bg-gray-200/70 dark:bg-gray-700/60 mb-10" />
    <ProductGridSkeleton count={8} />
  </div>
);

export default Skeleton;
