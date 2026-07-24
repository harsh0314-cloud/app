import { Plus, Trash2 } from 'lucide-react';

const PRESETS = {
  Clothing: ['Size', 'Chest', 'Length', 'Shoulder', 'Sleeve'],
  Footwear: ['UK', 'US', 'EU', 'Foot Length (cm)'],
  Trousers: ['Size', 'Waist', 'Hip', 'Inseam'],
};

export default function ProductAttributesEditor({ highlights = [], onHighlightsChange, sizeGuide = null, onSizeGuideChange }) {
  // ---- Key Highlights ----
  const setHl = (i, field, val) => {
    const next = highlights.map((h, idx) => (idx === i ? { ...h, [field]: val } : h));
    onHighlightsChange(next);
  };
  const addHl = () => onHighlightsChange([...highlights, { label: '', value: '' }]);
  const removeHl = (i) => onHighlightsChange(highlights.filter((_, idx) => idx !== i));

  // ---- Size Guide ----
  const enabled = !!sizeGuide;
  const columns = sizeGuide?.columns || [];
  const rows = sizeGuide?.rows || [];

  const enableGuide = (preset) => {
    const cols = PRESETS[preset] || ['Size', ''];
    onSizeGuideChange({ columns: cols, rows: [cols.map(() => '')] });
  };
  const disableGuide = () => onSizeGuideChange(null);
  const setColumn = (ci, val) => onSizeGuideChange({ ...sizeGuide, columns: columns.map((c, i) => (i === ci ? val : c)) });
  const addColumn = () => onSizeGuideChange({ columns: [...columns, ''], rows: rows.map((r) => [...r, '']) });
  const removeColumn = (ci) =>
    onSizeGuideChange({ columns: columns.filter((_, i) => i !== ci), rows: rows.map((r) => r.filter((_, i) => i !== ci)) });
  const setCell = (ri, ci, val) =>
    onSizeGuideChange({ ...sizeGuide, rows: rows.map((r, i) => (i === ri ? r.map((c, j) => (j === ci ? val : c)) : r)) });
  const addRow = () => onSizeGuideChange({ ...sizeGuide, rows: [...rows, columns.map(() => '')] });
  const removeRow = (ri) => onSizeGuideChange({ ...sizeGuide, rows: rows.filter((_, i) => i !== ri) });

  const inputCls = 'w-full px-2 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground';

  return (
    <div className="space-y-8" data-testid="product-attributes-editor">
      {/* KEY HIGHLIGHTS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-semibold text-foreground">Key Highlights</label>
          <button type="button" onClick={addHl} data-testid="add-highlight-row" className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 border border-border rounded-lg hover:bg-muted">
            <Plus size={14} /> Add Row
          </button>
        </div>
        {highlights.length === 0 && <p className="text-xs text-muted-foreground mb-2">No highlights yet. Add attribute rows specific to this product (e.g. Fabric / Sole Material / RAM).</p>}
        <div className="space-y-2">
          {highlights.map((h, i) => (
            <div key={i} className="flex gap-2" data-testid={`highlight-row-${i}`}>
              <input value={h.label || h.name || ''} onChange={(e) => setHl(i, 'label', e.target.value)} placeholder="Name (e.g. Fabric)" className={inputCls} data-testid={`highlight-label-${i}`} />
              <input value={h.value || ''} onChange={(e) => setHl(i, 'value', e.target.value)} placeholder="Value (e.g. 100% Cotton)" className={inputCls} data-testid={`highlight-value-${i}`} />
              <button type="button" onClick={() => removeHl(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0" data-testid={`highlight-remove-${i}`}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SIZE GUIDE */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-semibold text-foreground">Size Guide</label>
          {enabled ? (
            <button type="button" onClick={disableGuide} data-testid="remove-size-guide" className="text-xs font-semibold px-3 py-1.5 border border-border rounded-lg hover:bg-muted text-red-500">
              Remove Size Guide
            </button>
          ) : (
            <div className="flex gap-2">
              {Object.keys(PRESETS).map((p) => (
                <button key={p} type="button" onClick={() => enableGuide(p)} data-testid={`size-guide-preset-${p}`} className="text-xs font-semibold px-3 py-1.5 border border-border rounded-lg hover:bg-muted">
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {!enabled && <p className="text-xs text-muted-foreground">No size guide. Pick a preset above, or leave empty to hide the Size Guide button on the product page.</p>}

        {enabled && (
          <div className="overflow-x-auto">
            <table className="w-full border border-border rounded-lg text-sm">
              <thead>
                <tr className="bg-muted">
                  {columns.map((c, ci) => (
                    <th key={ci} className="p-2">
                      <div className="flex items-center gap-1">
                        <input value={c} onChange={(e) => setColumn(ci, e.target.value)} placeholder="Column" className={inputCls} data-testid={`sg-col-${ci}`} />
                        <button type="button" onClick={() => removeColumn(ci)} className="p-1 text-red-500 shrink-0" title="Remove column">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </th>
                  ))}
                  <th className="p-2">
                    <button type="button" onClick={addColumn} data-testid="sg-add-col" className="text-xs px-2 py-1 border border-border rounded-lg whitespace-nowrap">+ Col</button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, ri) => (
                  <tr key={ri} className="border-t border-border">
                    {columns.map((_, ci) => (
                      <td key={ci} className="p-2">
                        <input value={r[ci] ?? ''} onChange={(e) => setCell(ri, ci, e.target.value)} className={inputCls} data-testid={`sg-cell-${ri}-${ci}`} />
                      </td>
                    ))}
                    <td className="p-2">
                      <button type="button" onClick={() => removeRow(ri)} className="p-1 text-red-500" title="Remove row" data-testid={`sg-row-remove-${ri}`}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" onClick={addRow} data-testid="sg-add-row" className="mt-2 flex items-center gap-1 text-xs font-semibold px-3 py-1.5 border border-border rounded-lg hover:bg-muted">
              <Plus size={14} /> Add Row
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
