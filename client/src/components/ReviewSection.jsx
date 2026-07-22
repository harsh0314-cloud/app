import { useState, useEffect, useCallback } from 'react';
import { Star, MessageSquare, User } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

function StarRating({ rating, size = 16, interactive = false, onRate }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onRate?.(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          className={`transition-colors ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <Star
            size={size}
            className={star <= (hover || rating) ? 'text-gold' : 'text-gray-300'}
            style={{ fill: star <= (hover || rating) ? '#C7A86D' : 'transparent' }}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({ productId, onReviewSubmitted }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [checking, setChecking] = useState(true);

    useEffect(() => {
    if (!productId) return;
    let isMounted = true;

    const fetchCanReview = async () => {
      try {
        const res = await api.get(`/reviews/can-review/${productId}`);
        if (!isMounted) return;
        const canReviewValue = res.data?.data?.canReview ?? res.data?.canReview ?? false;
        setCanReview(canReviewValue);
      } catch (err) {
        console.error('canReview error:', err.response?.data || err.message);
        if (!isMounted) return;
        setCanReview(false);
      } finally {
        if (!isMounted) return;
        setChecking(false);
      }
    };

    fetchCanReview();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/reviews/product/${productId}`, { rating, comment });
      toast.success('Review submitted!');
      setRating(0);
      setComment('');
      onReviewSubmitted();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  if (checking) return null;
    if (!canReview) {
    return (
      <div className="bg-surface p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Purchase this product to leave a review
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface p-6 space-y-4">
      <h3 className="font-display text-lg font-semibold">Write a Review</h3>

      <div className="space-y-2">
        <label className="text-sm font-medium">Your Rating</label>
        <StarRating rating={rating} size={24} interactive onRate={setRating} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Your Review</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your thoughts about this product..."
          rows={4}
          className="w-full border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading || rating === 0}
        className="bg-foreground px-8 py-3 text-[11px] font-semibold uppercase tracking-luxe-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
}

function ReviewItem({ review, onDelete }) {
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const checkOwnership = () => {
      const user = JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.user;
      setIsOwner(user?.id === review.userId);
    };
    checkOwnership();
  }, [review.userId]);

  return (
    <div className="border-b border-border py-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-surface">
            <User size={18} className="text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">
              {review.user?.firstName && review.user?.lastName 
                ? `${review.user.firstName} ${review.user.lastName}`
                : review.user?.firstName 
                  ? review.user.firstName 
                  : 'Anonymous'}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(review.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
        <StarRating rating={review.rating} size={14} />
      </div>

      {review.comment && (
        <p className="mt-3 text-sm leading-relaxed text-foreground/80">
          {review.comment}
        </p>
      )}

      {isOwner && (
        <button
          onClick={() => onDelete(review.id)}
          className="mt-3 text-xs text-red-500 hover:underline"
        >
          Delete
        </button>
      )}
    </div>
  );
}

export default function ReviewSection({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ avgRating: 0, totalReviews: 0, distribution: {} });
  const [loading, setLoading] = useState(true);

    const fetchReviews = useCallback(async () => {
    if (!productId) return;
    try {
      const res = await api.get(`/reviews/product/${productId}`);
      const responseData = res.data?.data || res.data;
      setReviews(responseData?.reviews || []);
      setStats({
        avgRating: responseData?.avgRating || 0,
        totalReviews: responseData?.totalReviews || 0,
        distribution: responseData?.distribution || {}
      });
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
      setReviews([]);
      setStats({ avgRating: 0, totalReviews: 0, distribution: {} });
    } finally {
      setLoading(false);
    }
  }, [productId]);

    useEffect(() => {
    if (!productId) return;
    const loadReviews = async () => {
      await fetchReviews();
    };
    loadReviews();
  }, [fetchReviews, productId]);

  const handleDelete = async (reviewId) => {
    try {
      await api.delete(`/reviews/${reviewId}`);
      toast.success('Review deleted');
      fetchReviews();
    } catch (err) {
      toast.error('Failed to delete review');
    }
  };

  if (loading) {
    return (
      <div className="container-luxe py-16">
        <div className="h-8 w-48 animate-pulse bg-surface" />
      </div>
    );
  }

  return (
    <section className="container-luxe py-16">
      <div className="grid gap-12 lg:grid-cols-3">
        {/* Rating Summary */}
        <div className="space-y-6">
          <h2 className="font-display text-2xl font-bold">Customer Reviews</h2>

          <div className="flex items-baseline gap-3">
            <span className="font-display text-5xl font-bold">{stats.avgRating}</span>
            <span className="text-muted-foreground">/ 5</span>
          </div>

          <StarRating rating={Math.round(stats.avgRating)} size={20} />
          <p className="text-sm text-muted-foreground">Based on {stats.totalReviews} reviews</p>

          {/* Rating Distribution */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.distribution[star] || 0;
              const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-xs w-3">{star}</span>
                  <Star size={12} className="text-gold" style={{ fill: '#C7A86D' }} />
                  <div className="flex-1 h-2 bg-surface">
                    <div
                      className="h-full bg-gold transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reviews List */}
        <div className="lg:col-span-2">
          <ReviewForm productId={productId} onReviewSubmitted={fetchReviews} />

          <div className="mt-8">
            {reviews.length === 0 ? (
              <div className="py-12 text-center">
                <MessageSquare size={32} className="mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
              </div>
            ) : (
              reviews.map((review) => (
                <ReviewItem
                  key={review.id}
                  review={review}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}