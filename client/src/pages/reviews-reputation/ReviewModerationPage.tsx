/**
 * ReviewModerationPage — FLOW-10 T170
 * Moderation queue: pending reviews awaiting human review.
 */
import React, { useState, useEffect } from 'react';

interface PendingReview {
  reviewId: string;
  reviewerId: string;
  targetEntityId: string;
  rating: number;
  status: 'PENDING';
  queuedAt: string;
}

export function ReviewModerationPage() {
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading pending reviews
    setTimeout(() => {
      setReviews([
        {
          reviewId: 'review-pending-001',
          reviewerId: 'user-001',
          targetEntityId: 'entity-001',
          rating: 3,
          status: 'PENDING',
          queuedAt: '2026-04-13T10:00:00Z',
        },
        {
          reviewId: 'review-pending-002',
          reviewerId: 'user-002',
          targetEntityId: 'entity-002',
          rating: 2,
          status: 'PENDING',
          queuedAt: '2026-04-13T11:00:00Z',
        },
      ]);
      setLoading(false);
    }, 200);
  }, []);

  return (
    <div className="p-6" data-testid="review-moderation-page">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Moderation Queue</h1>
      <p className="text-sm text-gray-500 mb-4">Reviews pending human decision</p>

      {loading ? (
        <div data-testid="moderation-loading" className="text-gray-500">
          Loading pending reviews...
        </div>
      ) : reviews.length === 0 ? (
        <div data-testid="moderation-empty" className="text-gray-500">
          No pending reviews.
        </div>
      ) : (
        <div className="space-y-3" data-testid="moderation-queue">
          {reviews.map((review) => (
            <div
              key={review.reviewId}
              className="border rounded p-4 bg-yellow-50"
              data-testid={`pending-review-${review.reviewId}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-sm font-medium text-gray-800">
                    Review {review.reviewId}
                  </span>
                  <span
                    className="ml-2 px-2 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded"
                    data-testid="pending-badge"
                  >
                    PENDING
                  </span>
                </div>
                <span className="text-sm text-gray-500">Rating: {review.rating}/5</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Entity: {review.targetEntityId} | Queued:{' '}
                {new Date(review.queuedAt).toLocaleString()}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  data-testid={`approve-${review.reviewId}`}
                >
                  Approve
                </button>
                <button
                  className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                  data-testid={`reject-${review.reviewId}`}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
