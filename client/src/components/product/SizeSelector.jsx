export default function SizeSelector({ sizes = [], selected, onSelect }) {
  return (
    <div className="mt-8" data-testid="size-selector">
      <div className="flex flex-wrap gap-3">
        {sizes.map((s) => {
          const soldOut = s.stock === 0;
          const isActive = selected === s.label;
          return (
            <button
              key={s.label}
              type="button"
              disabled={soldOut}
              onClick={() => onSelect(s.label)}
              data-testid={`size-option-${s.label}`}
              className={`relative flex min-w-[3.25rem] flex-col items-center border px-4 py-3 text-sm font-semibold transition-all duration-200
                ${isActive ? 'border-foreground bg-foreground text-white' : 'border-border text-foreground hover:border-foreground'}
                ${soldOut ? 'cursor-not-allowed border-border text-muted-foreground opacity-50 line-through hover:border-border' : ''}`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
      {/* Low stock indicators */}
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
        {sizes.map((s) =>
          typeof s.stock === 'number' && s.stock > 0 && s.stock <= 5 ? (
            <span key={s.label} className="text-[11px] font-medium text-sale-red" data-testid={`size-lowstock-${s.label}`}>
              {s.label}: Only {s.stock} left
            </span>
          ) : null
        )}
      </div>
    </div>
  );
}
