import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, ArrowRight } from 'lucide-react';
import api from '../services/api';
import { STATUS_BADGE, STATUS_LABEL } from '../lib/returnStatus';

export default function MyReturns() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/returns')
      .then((res) => setReturns(res.data.returns || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-muted-foreground">Loading returns…</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center gap-3 mb-8">
        <RotateCcw size={22} />
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Returns & Exchanges</h1>
      </div>

      {returns.length === 0 ? (
        <div className="text-center py-20 bg-muted/40 rounded-2xl border border-border">
          <p className="text-muted-foreground mb-2">You haven't requested any returns yet.</p>
          <Link to="/orders" className="text-primary font-medium hover:underline">View your orders</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {returns.map((r) => (
            <Link to={`/returns/${r.id}`} key={r.id} data-testid={`my-return-${r.id}`}
              className="block bg-card border border-border rounded-2xl overflow-hidden hover:shadow-sm hover:border-foreground/40 transition-all">
              <div className="px-6 py-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{r.type === 'EXCHANGE' ? 'Exchange' : 'Return'} · Order</p>
                  <p className="font-bold text-foreground">{r.order?.orderNumber}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(r.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
                <div className="flex-1 min-w-[10rem] text-sm text-muted-foreground">
                  <p>{(r.items || []).length} item(s) · Reason: <span className="text-foreground">{r.reason}</span></p>
                  {r.refundAmount && <p className="text-xs">Refund: ₹{parseFloat(r.refundAmount).toFixed(2)}</p>}
                </div>
                <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold ${STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-700'}`}>
                  {STATUS_LABEL[r.status] || r.status}
                </span>
                <ArrowRight size={16} className="text-muted-foreground"/>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
