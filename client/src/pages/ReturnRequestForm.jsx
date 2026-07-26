import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Upload, X, Info, Image as ImageIcon, RotateCcw, Package } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const REASONS = [
  { code: 'WRONG_SIZE',    label: 'Wrong size' },
  { code: 'WRONG_PRODUCT', label: 'Wrong product delivered' },
  { code: 'DAMAGED',       label: 'Damaged in transit' },
  { code: 'DEFECTIVE',     label: 'Defective / does not work' },
  { code: 'QUALITY',       label: 'Quality issue' },
  { code: 'CHANGED_MIND',  label: 'No longer want it' },
  { code: 'OTHER',         label: 'Something else' },
];

const REFUND_METHODS = [
  { code: 'ORIGINAL',     label: 'Original payment method', hint: 'Refund to card/UPI/netbanking used at checkout' },
  { code: 'WALLET',       label: 'Store wallet',            hint: 'Instant credit — usable on your next order' },
  { code: 'STORE_CREDIT', label: 'Store credit coupon',     hint: 'Single-use coupon valid for 12 months' },
];

export default function ReturnRequestForm() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState(null);
  const [eligibleItems, setEligibleItems] = useState([]);
  const [type, setType] = useState('RETURN');
  const [selection, setSelection] = useState({});   // { orderItemId: { qty, exchangeSize } }
  const [reasonCode, setReasonCode] = useState('WRONG_SIZE');
  const [otherReason, setOtherReason] = useState('');
  const [comments, setComments] = useState('');
  const [refundMethod, setRefundMethod] = useState('ORIGINAL');
  const [images, setImages] = useState([]);         // [{ url, publicId }]
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    api.get(`/returns/eligibility/${orderId}`)
      .then((res) => { setOrder(res.data.order); setEligibleItems(res.data.items || []); })
      .catch((e) => { toast.error(e.message || 'Failed to load order'); navigate(`/orders/${orderId}`); })
      .finally(() => setLoading(false));
  }, [orderId, navigate]);

  const toggleItem = (item) => {
    setSelection((prev) => {
      const next = { ...prev };
      if (next[item.orderItemId]) delete next[item.orderItemId];
      else next[item.orderItemId] = { qty: 1, exchangeSize: '' };
      return next;
    });
  };
  const setQty = (id, qty) => setSelection((p) => ({ ...p, [id]: { ...p[id], qty: Math.max(1, qty) } }));
  const setExchangeSize = (id, v) => setSelection((p) => ({ ...p, [id]: { ...p[id], exchangeSize: v } }));

  const selectedIds = Object.keys(selection);
  const eligibleForType = useMemo(
    () => eligibleItems.filter((i) => (type === 'RETURN' ? i.isReturnable : i.isExchangeable)),
    [eligibleItems, type]
  );

  const estRefund = useMemo(() => {
    if (type === 'EXCHANGE') return 0;
    return selectedIds.reduce((sum, id) => {
      const item = eligibleItems.find((x) => x.orderItemId === id);
      const qty = selection[id]?.qty || 1;
      return sum + (item ? parseFloat(item.price) * qty : 0);
    }, 0);
  }, [selection, eligibleItems, type, selectedIds]);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (images.length + files.length > 5) { toast.error('You can upload at most 5 images'); e.target.value = ''; return; }
    for (const f of files) {
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name} is larger than 10 MB`); return; }
    }
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('images', f));
      const res = await api.post('/returns/upload', fd);
      const uploaded = res.data?.images || res.data?.data?.images || [];
      setImages((prev) => [...prev, ...uploaded.map((u) => ({ url: u.url, publicId: u.publicId }))]);
      toast.success(`${uploaded.length} image(s) uploaded`);
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally { setUploading(false); e.target.value = ''; }
  };

  const removeImage = (idx) => {
    const img = images[idx];
    setImages((prev) => prev.filter((_, i) => i !== idx));
    if (img?.url) {
      // Best-effort cleanup; admin/customer both allowed via /returns/upload — but we don't expose a customer delete.
      // Silently ignore failures.
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedIds.length) return toast.error('Select at least one item.');
    if (reasonCode === 'OTHER' && !otherReason.trim()) return toast.error('Please describe your reason.');

    if (type === 'EXCHANGE') {
      const missing = selectedIds.find((id) => !selection[id].exchangeSize);
      if (missing) return toast.error('Pick an available size for each item to exchange.');
    }

    const readableReason =
      reasonCode === 'OTHER'
        ? otherReason.trim()
        : REASONS.find((r) => r.code === reasonCode)?.label || 'Return';

    const payload = {
      orderId,
      type,
      reason: readableReason,
      subReason: reasonCode,
      comments: comments.trim() || null,
      refundMethod: type === 'RETURN' ? refundMethod : null,
      items: selectedIds.map((id) => {
        const item = eligibleItems.find((x) => x.orderItemId === id);
        const state = selection[id];
        return {
          orderItemId: id,
          quantity: Math.min(state.qty || 1, item?.remainingQty || 1),
          exchangeSize: type === 'EXCHANGE' ? state.exchangeSize : null,
        };
      }),
      images,
    };

    setSubmitting(true);
    try {
      const res = await api.post('/returns', payload);
      const requestId = res.data?.request?.id;
      toast.success(`${type === 'EXCHANGE' ? 'Exchange' : 'Return'} request submitted`);
      navigate(requestId ? `/returns/${requestId}` : '/returns');
    } catch (err) {
      toast.error(err.message || 'Failed to submit request');
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-muted-foreground">Loading eligibility…</div>;
  }
  if (!order) return null;

  const totallyIneligible = eligibleForType.length === 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <button onClick={() => navigate(`/orders/${orderId}`)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6" data-testid="return-back-btn">
        <ArrowLeft size={16} /> Back to order
      </button>

      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Return or Exchange</h1>
          <p className="text-sm text-muted-foreground mt-1">Order <span className="font-medium text-foreground">{order.orderNumber}</span></p>
        </div>
        <div className="inline-flex rounded-full border border-border bg-card p-1" data-testid="return-type-toggle">
          {['RETURN', 'EXCHANGE'].map((t) => (
            <button key={t} type="button" onClick={() => setType(t)}
              data-testid={`return-type-${t}`}
              className={`px-5 py-2 text-xs font-semibold uppercase tracking-wide rounded-full transition-colors ${type === t ? 'bg-foreground text-white' : 'text-muted-foreground hover:text-foreground'}`}>
              {t === 'RETURN' ? 'Return' : 'Exchange'}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8" data-testid="return-form">
        {/* Item Selection */}
        <section className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2"><Package size={14}/> Select items</h2>

          {totallyIneligible ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No item in this order is eligible for {type.toLowerCase()} right now.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {eligibleItems.map((it) => {
                const eligible = type === 'RETURN' ? it.isReturnable : it.isExchangeable;
                const selected = !!selection[it.orderItemId];
                return (
                  <li key={it.orderItemId} data-testid={`return-item-${it.orderItemId}`} className={`py-4 flex flex-col sm:flex-row gap-4 ${!eligible ? 'opacity-60' : ''}`}>
                    <label className="flex items-start gap-4 flex-1 cursor-pointer">
                      <input type="checkbox" disabled={!eligible} checked={selected} onChange={() => toggleItem(it)} className="mt-1 accent-black" data-testid={`return-item-check-${it.orderItemId}`} />
                      <img src={it.image} alt="" className="w-16 h-16 rounded-lg object-cover bg-muted"/>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{it.name}</p>
                        {it.size && <p className="text-xs text-muted-foreground">Size: {it.size}</p>}
                        <p className="text-xs text-muted-foreground">₹{parseFloat(it.price).toFixed(2)} × {it.quantity}</p>
                        {!eligible && it.reasonIfBlocked && (
                          <p className="text-xs text-red-600 mt-1 inline-flex items-center gap-1"><Info size={12}/> {it.reasonIfBlocked}</p>
                        )}
                      </div>
                    </label>

                    {selected && eligible && (
                      <div className="flex flex-col gap-2 sm:items-end sm:w-64">
                        <label className="text-xs text-muted-foreground inline-flex items-center gap-2">
                          Qty
                          <select data-testid={`return-item-qty-${it.orderItemId}`} value={selection[it.orderItemId]?.qty || 1} onChange={(e) => setQty(it.orderItemId, parseInt(e.target.value))} className="border border-border rounded-lg px-2 py-1 text-sm bg-card">
                            {Array.from({ length: Math.max(1, it.remainingQty) }).map((_, i) => <option key={i} value={i+1}>{i+1}</option>)}
                          </select>
                        </label>
                        {type === 'EXCHANGE' && (
                          <label className="text-xs text-muted-foreground inline-flex items-center gap-2 w-full sm:justify-end">
                            New size
                            <select
                              required
                              data-testid={`return-item-size-${it.orderItemId}`}
                              value={selection[it.orderItemId]?.exchangeSize || ''}
                              onChange={(e) => setExchangeSize(it.orderItemId, e.target.value)}
                              className="border border-border rounded-lg px-2 py-1 text-sm bg-card min-w-[8rem]"
                            >
                              <option value="">Select size…</option>
                              {(it.availableSizes || []).map((s) => (
                                <option key={s.id} value={s.value}>{s.value} — {s.stock} in stock</option>
                              ))}
                            </select>
                          </label>
                        )}
                        {type === 'EXCHANGE' && (!it.availableSizes || it.availableSizes.length === 0) && (
                          <p className="text-xs text-amber-700 inline-flex items-center gap-1"><Info size={12}/> No other sizes in stock</p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Reason */}
        <section className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Why are you {type === 'EXCHANGE' ? 'exchanging' : 'returning'} it?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {REASONS.map((r) => (
              <label key={r.code} className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-colors ${reasonCode === r.code ? 'border-foreground bg-muted/40' : 'border-border hover:border-foreground/40'}`}>
                <input type="radio" name="reason" checked={reasonCode === r.code} onChange={() => setReasonCode(r.code)} className="accent-black" data-testid={`return-reason-${r.code}`}/>
                <span className="text-sm text-foreground">{r.label}</span>
              </label>
            ))}
          </div>
          {reasonCode === 'OTHER' && (
            <input type="text" value={otherReason} onChange={(e) => setOtherReason(e.target.value)} placeholder="Tell us what went wrong…" data-testid="return-other-reason" className="mt-3 w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:border-foreground outline-none"/>
          )}
          <textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Add any comments (optional)…" data-testid="return-comments" className="mt-3 w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:border-foreground outline-none"/>
        </section>

        {/* Photos */}
        <section className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Add photos (optional)</h2>
            <span className="text-xs text-muted-foreground">{images.length}/5</span>
          </div>
          <label className={`flex items-center justify-center gap-2 w-full border-2 border-dashed border-border rounded-xl px-4 py-6 cursor-pointer hover:border-foreground transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`} data-testid="return-upload-label">
            <Upload size={16} />
            <span className="text-sm">{uploading ? 'Uploading…' : 'Click to add photos (JPG/PNG/WebP, up to 5 · 10 MB each)'}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFiles} disabled={uploading || images.length >= 5} className="hidden" data-testid="return-upload-input"/>
          </label>
          {images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border group" data-testid={`return-image-${i}`}>
                  <img src={img.url} alt="" className="w-full h-full object-cover cursor-zoom-in" onClick={() => setPreviewUrl(img.url)}/>
                  <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 rounded-full bg-black/70 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`return-image-remove-${i}`}>
                    <X size={12}/>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Refund Method (RETURN only) */}
        {type === 'RETURN' && (
          <section className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Refund method</h2>
            <div className="space-y-2">
              {REFUND_METHODS.map((m) => (
                <label key={m.code} className={`flex items-start gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-colors ${refundMethod === m.code ? 'border-foreground bg-muted/40' : 'border-border hover:border-foreground/40'}`}>
                  <input type="radio" name="refundMethod" checked={refundMethod === m.code} onChange={() => setRefundMethod(m.code)} className="mt-0.5 accent-black" data-testid={`return-refund-${m.code}`}/>
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.hint}</p>
                  </div>
                </label>
              ))}
            </div>
            {selectedIds.length > 0 && (
              <p className="mt-4 text-sm text-muted-foreground">Estimated refund: <span className="font-semibold text-foreground">₹{estRefund.toFixed(2)}</span></p>
            )}
          </section>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
          <Link to={`/orders/${orderId}`} className="rounded-xl border border-border px-6 py-3 text-sm text-center font-semibold text-foreground hover:bg-muted transition-colors">Cancel</Link>
          <button type="submit" disabled={submitting || !selectedIds.length} data-testid="return-submit" className="inline-flex items-center gap-2 rounded-xl bg-foreground text-white px-6 py-3 text-sm font-semibold uppercase tracking-wider hover:opacity-90 disabled:opacity-50">
            <RotateCcw size={16}/> {submitting ? 'Submitting…' : `Submit ${type === 'EXCHANGE' ? 'Exchange' : 'Return'} Request`}
          </button>
        </div>
      </form>

      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6" onClick={() => setPreviewUrl(null)} data-testid="return-image-preview">
          <img src={previewUrl} alt="" className="max-h-[85vh] max-w-full object-contain rounded-xl"/>
        </div>
      )}
    </div>
  );
}
