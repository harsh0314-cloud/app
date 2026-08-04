import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Users, Share2, Copy, Check, Trophy, Clock, Gift, ExternalLink } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_META = {
  PENDING:   { label: 'Awaiting first order', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  COMPLETED: { label: 'Order completed',       color: 'bg-blue-50 text-blue-700 border-blue-200' },
  REWARDED:  { label: 'Rewarded',                color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export default function ReferralsPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.get('/referrals/me')
      .then((res) => { if (mounted) setData(res.data); })
      .catch((e) => toast.error(e.message || 'Failed to load referrals'))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const copyLink = async () => {
    if (!data?.shareLink) return;
    try {
      await navigator.clipboard.writeText(data.shareLink);
      setCopied(true);
      toast.success('Share link copied!');
      setTimeout(() => setCopied(false), 1800);
    } catch { toast.error('Could not copy — copy manually.'); }
  };

  const copyCode = async () => {
    if (!data?.code) return;
    try {
      await navigator.clipboard.writeText(data.code);
      toast.success('Referral code copied!');
    } catch { toast.error('Could not copy code'); }
  };

  const nativeShare = async () => {
    if (!data) return;
    const shareData = {
      title: 'Join me on StoreX',
      text: `Sign up on StoreX using my code ${data.code} and get 200 welcome points!`,
      url: data.shareLink,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await copyLink();
    } catch { /* user cancelled */ }
  };

  if (loading) {
    return <div className="animate-pulse h-48 rounded-2xl bg-gray-100 dark:bg-gray-800" data-testid="referrals-loading" />;
  }
  if (!data) return null;

  const stats = data.stats || {};

  return (
    <div className="space-y-8" data-testid="referrals-panel">
      {/* HERO */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-indigo-600 via-fuchsia-600 to-amber-500 p-8 text-white"
      >
        <div className="relative z-10 grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <p className="text-xs uppercase tracking-widest opacity-80 inline-flex items-center gap-2">
              <Users size={14}/> Your referral code
            </p>
            <p className="mt-2 font-display text-4xl md:text-5xl font-bold tracking-tight" data-testid="referral-code">{data.code}</p>
            <p className="mt-2 text-sm opacity-90 max-w-md">
              Share your code. When a friend joins and completes their first order, you get <strong>+500</strong> loyalty points and they get <strong>+200</strong> welcome points.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button onClick={copyCode} data-testid="copy-code-btn" className="inline-flex items-center gap-2 rounded-md bg-white/15 hover:bg-white/25 backdrop-blur px-3 py-2 text-xs font-semibold">
                <Copy size={14}/> Copy code
              </button>
              <button onClick={copyLink} data-testid="copy-link-btn" className="inline-flex items-center gap-2 rounded-md bg-white text-gray-900 hover:bg-gray-100 px-3 py-2 text-xs font-semibold">
                {copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'Copied!' : 'Copy share link'}
              </button>
              <button onClick={nativeShare} data-testid="native-share-btn" className="inline-flex items-center gap-2 rounded-md border border-white/40 hover:bg-white/10 px-3 py-2 text-xs font-semibold">
                <Share2 size={14}/> Share
              </button>
            </div>
            {data.shareLink && (
              <div className="mt-3 flex items-center gap-2 rounded-md bg-black/25 px-3 py-2 text-xs font-mono truncate" data-testid="share-link">
                <ExternalLink size={12}/> <span className="truncate">{data.shareLink}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center rounded-xl bg-white/10 backdrop-blur p-5">
            <p className="text-xs uppercase tracking-widest opacity-80">Rewards earned</p>
            <p className="mt-2 text-3xl font-bold" data-testid="referrals-rewards-points">{(stats.rewardsPoints || 0).toLocaleString()} pts</p>
            <p className="mt-1 text-xs opacity-80">from {stats.successful || 0} successful referral{stats.successful === 1 ? '' : 's'}</p>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      </motion.div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox icon={Users}   label="Total invited"   value={stats.total || 0}      testId="stat-total" />
        <StatBox icon={Clock}   label="Pending"          value={stats.pending || 0}    testId="stat-pending" />
        <StatBox icon={Trophy}  label="Successful"       value={stats.successful || 0} testId="stat-successful" />
        <StatBox icon={Sparkles} label="Points earned"   value={(stats.rewardsPoints || 0)} testId="stat-rewards" />
      </div>

      {/* HOW IT WORKS */}
      <div className="rounded-2xl border border-border p-6 bg-white dark:bg-gray-800">
        <h3 className="font-semibold text-sm inline-flex items-center gap-2"><Gift size={14}/> How it works</h3>
        <ol className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
          <li>1. Share your unique code or link with a friend.</li>
          <li>2. They register on StoreX using your code.</li>
          <li>3. When their first order is delivered, you both get loyalty points.</li>
        </ol>
      </div>

      {/* REFERRALS LIST */}
      <div className="rounded-2xl border border-border bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-semibold text-sm inline-flex items-center gap-2"><Users size={14}/> Your referrals</h3>
          <p className="text-xs text-muted-foreground">{stats.total || 0} total</p>
        </div>
        <div className="divide-y divide-border">
          {(data.referrals || []).length === 0 && (
            <p className="p-10 text-center text-sm text-muted-foreground">
              Nobody has used your code yet. Share the link above to invite friends!
            </p>
          )}
          {(data.referrals || []).map((r) => {
            const meta = STATUS_META[r.status] || STATUS_META.PENDING;
            return (
              <div key={r.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4" data-testid={`referral-row-${r.id}`}>
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 grid place-items-center text-white font-semibold">
                    {(r.referredUser?.firstName?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {r.referredUser?.firstName || 'Friend'} {r.referredUser?.lastName || ''}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.referredUser?.email || 'hidden'} · joined {new Date(r.referredUser?.joinedAt || r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${meta.color}`}>{meta.label}</span>
                  {r.status === 'REWARDED' && (
                    <span className="text-xs font-semibold text-emerald-700">+500 pts</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatBox({ icon: Icon, label, value, testId }) {
  return (
    <div className="rounded-xl border border-border bg-white dark:bg-gray-800 p-4 flex items-center gap-3" data-testid={testId}>
      <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 grid place-items-center">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="font-semibold text-lg">{Number(value).toLocaleString()}</p>
      </div>
    </div>
  );
}
