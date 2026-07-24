export default function KeyHighlights({ product }) {
  const raw = Array.isArray(product?.keyHighlights) ? product.keyHighlights : [];
  const highlights = raw
    .map((h) => ({ label: h.label || h.name, value: h.value }))
    .filter((h) => h.label && h.value);

  if (highlights.length === 0) return null;

  return (
    <div className="mt-16" data-testid="key-highlights">
      <h2 className="font-display text-2xl font-bold tracking-tight">Key Highlights</h2>
      <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-6">
        {highlights.map((h, i) => (
          <div key={i} className="border-b border-border pb-4">
            <p className="text-xs text-muted-foreground">{h.label}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{h.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
