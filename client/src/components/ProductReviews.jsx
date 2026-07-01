import { useState, useEffect } from "react";
import * as reviewsApi from "../api/reviews";
import { getErrorMessage } from "../utils/errorHelpers";
import { useAuth } from "../hooks/useAuth";
import StarRating from "./StarRating";

const fmtDate = (d) => new Date(d).toLocaleDateString("en-NP", { day: "numeric", month: "short", year: "numeric" });

export default function ProductReviews({ productId, embedded = false }) {
  const { user } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  const [eligibility, setEligibility] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formRating, setFormRating] = useState(0);
  const [formComment, setFormComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      try {
        const data = await reviewsApi.getReviews(productId, { page });
        if (!ignore) {
          setReviews(data.reviews);
          setPages(data.pages);
          setTotal(data.total);
          setError("");
        }
      } catch (err) {
        if (!ignore) setError(getErrorMessage(err));
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [productId, page, refreshTick]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!user) {
        if (!ignore) setEligibility(null);
        return;
      }
      try {
        const data = await reviewsApi.getEligibility(productId);
        if (!ignore) {
          setEligibility(data);
          if (data.existingReview) {
            setFormRating(data.existingReview.rating);
            setFormComment(data.existingReview.comment || "");
          }
        }
      } catch {
        // eligibility is best-effort; leave the write-review section hidden on failure
      }
    }
    load();
    return () => { ignore = true; };
  }, [productId, user, refreshTick]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (formRating === 0) {
      setSubmitError("Please select a star rating");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      await reviewsApi.createReview(productId, { rating: formRating, comment: formComment.trim() });
      setSubmitted(true);
      setShowForm(false);
      setPage(1);
      setRefreshTick((t) => t + 1);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={embedded ? "" : "mt-12 border-t border-gray-200 pt-8"}>
      {!embedded && (
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Reviews{total > 0 && <span className="text-gray-400 font-normal"> ({total})</span>}
        </h2>
      )}

      {/* Write-a-review section */}
      {user && eligibility && (
        <div className="mb-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
          {!eligibility.hasPurchased ? (
            <p className="text-sm text-gray-500">
              Only customers who have received a delivery of this product can write a review.
            </p>
          ) : showForm ? (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Your rating</p>
                <StarRating rating={formRating} size="lg" interactive onChange={setFormRating} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your review (optional)
                </label>
                <textarea
                  value={formComment}
                  onChange={(e) => setFormComment(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What did you think of this product?"
                />
              </div>
              {submitError && <p className="text-sm text-red-600">{submitError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "Submitting…" : eligibility.alreadyReviewed ? "Update review" : "Submit review"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-gray-600">
                {eligibility.alreadyReviewed ? "You've already reviewed this product." : "Verified purchase — share your thoughts."}
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                {eligibility.alreadyReviewed ? "Edit your review" : "Write a review"}
              </button>
            </div>
          )}
          {submitted && !showForm && (
            <p className="text-sm text-green-600 mt-2">Thanks for your review!</p>
          )}
        </div>
      )}

      {/* Review list */}
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-gray-400">No reviews yet. Be the first to review this product.</p>
      ) : (
        <div className="space-y-5">
          {reviews.map((r) => (
            <div key={r._id} className="border-b border-gray-100 pb-4 last:border-b-0">
              <div className="flex items-center gap-2 mb-1">
                <StarRating rating={r.rating} />
                <span className="text-sm font-medium text-gray-900">{r.userId?.name || "Anonymous"}</span>
                {r.isVerifiedPurchase && (
                  <span className="text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                    Verified Purchase
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mb-1.5">{fmtDate(r.createdAt)}</p>
              {r.comment && <p className="text-sm text-gray-700">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-40 hover:border-blue-400 transition-colors"
          >
            Previous
          </button>
          <span className="px-2 py-1.5 text-sm text-gray-500">
            Page {page} of {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-40 hover:border-blue-400 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
