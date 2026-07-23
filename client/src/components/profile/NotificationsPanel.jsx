import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCheck } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { EmptyState } from './ProfileUI';

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(date).toLocaleDateString();
};

export default function NotificationsPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);

  const load = async () => {
    try {
      const res = await api.get('/users/notifications');
      setItems(res.data?.notifications || []);
      setUnread(res.data?.unreadCount || 0);
    } catch (e) {
      // silent — endpoint is best-effort
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const markAll = async () => {
    try {
      await api.patch('/users/notifications/read-all');
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
      toast.success('All marked as read');
    } catch (e) {
      toast.error('Failed to update');
    }
  };

  const markOne = async (id) => {
    try {
      await api.patch(`/users/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnread((u) => Math.max(0, u - 1));
    } catch (e) { /* silent */ }
  };

  return (
    <div data-testid="notifications-panel">
      <div className="flex items-center justify-between mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
        <h2 className="font-display text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Notifications {unread > 0 && <span className="ml-2 text-xs font-bold bg-foreground text-white px-2 py-1 rounded-full align-middle">{unread}</span>}
        </h2>
        {unread > 0 && (
          <button data-testid="mark-all-read-btn" onClick={markAll} className="flex items-center gap-2 text-xs font-semibold text-foreground hover:underline">
            <CheckCheck size={15} /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Bell} title="All caught up!" description="You don't have any notifications yet." />
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              onClick={() => !n.isRead && markOne(n.id)}
              data-testid={`notification-${n.id}`}
              className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${n.isRead ? 'border-border bg-white dark:bg-gray-800' : 'border-foreground/30 bg-surface dark:bg-gray-900'}`}
            >
              <div className={`mt-0.5 p-2 rounded-full ${n.isRead ? 'bg-gray-100 dark:bg-gray-700 text-gray-400' : 'bg-foreground text-white'}`}>
                <Bell size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.message}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
              </div>
              {!n.isRead && <span className="w-2 h-2 rounded-full bg-foreground mt-2" />}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
