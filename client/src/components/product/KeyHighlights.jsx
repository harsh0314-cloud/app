export default function KeyHighlights({ product }) {
  const highlights = [
    { label: 'Fabric', value: '100% Cotton' },
    { label: 'Fit', value: 'Regular Fit' },
    { label: 'Sleeve', value: 'Half Sleeve' },
    { label: 'Neck', value: 'Round Neck' },
    { label: 'Pattern', value: 'Solid' },
    { label: 'Occasion', value: product?.category?.name || 'Casual Wear' },
    { label: 'Wash Care', value: 'Machine Wash Cold' },
    { label: 'Country of Origin', value: 'India' },
  ];

  return (
    <div className="mt-16" data-testid="key-highlights">
      <h2 className="font-display text-2xl font-bold tracking-tight">Key Highlights</h2>
      <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-6">
        {highlights.map((h) => (
          <div key={h.label} className="border-b border-border pb-4">
            <p className="text-xs text-muted-foreground">{h.label}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{h.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
