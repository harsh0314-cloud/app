import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { RotateCcw } from 'lucide-react';

const STATUS_COLORS = {
  REQUESTED: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-green-100 text-green-800',
};

export default function AdminReturns() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/admin/returns')
      .then((res) => setReturns(res.data.returns || []))
      .catch(() => toast.error('Failed to load returns'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const update = async (id, status) => {
    setBusyId(id);
    try {
      await api.patch(`/admin/returns/${id}`, { status });
      toast.success(`Marked ${status.toLowerCase()}`);
      load();
    } catch (e) {
      toast.error(e.message || 'Update failed');
    } finally { setBusyId(null); }
  };

  if (loading) return <div className="text-gray-500">Loading returns…</div>;

  return (
    <div className="space-y-6" data-testid="admin-returns-page">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3"><RotateCcw size={26} /> Returns & Exchanges</h1>

      {returns.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center text-gray-500">No return or exchange requests yet.</div>
      ) : (
        <div className="space-y-4">
          {returns.map((r) => (
            <div key={r.id} data-testid={`return-row-${r.id}`} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{r.order?.orderNumber} · <span className="uppercase text-xs">{r.type}</span></p>
                  <p className="text-sm text-gray-500">{r.order?.user?.firstName} {r.order?.user?.lastName} — {r.order?.user?.email}</p>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">Reason: {r.reason}</p>
                  <p className="text-xs text-gray-500 mt-1">Order total: ₹{parseFloat(r.order?.total || 0).toFixed(2)}{r.refundAmount ? ` · Refunded ₹${parseFloat(r.refundAmount).toFixed(2)}` : ''}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-700'}`}>{r.status}</span>
              </div>
              {['REQUESTED', 'APPROVED'].includes(r.status) && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 dark:border-gray-700 pt-4">
                  {r.status === 'REQUESTED' && (
                    <>
                      <button onClick={() => update(r.id, 'APPROVED')} disabled={busyId === r.id} data-testid={`approve-${r.id}`} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Approve</button>
                      <button onClick={() => update(r.id, 'REJECTED')} disabled={busyId === r.id} data-testid={`reject-${r.id}`} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Reject</button>
                    </>
                  )}
                  {r.status === 'APPROVED' && (
                    <button onClick={() => update(r.id, 'COMPLETED')} disabled={busyId === r.id} data-testid={`complete-${r.id}`} className="rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Complete & Refund</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
