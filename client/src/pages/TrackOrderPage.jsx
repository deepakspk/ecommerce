import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import * as ordersApi from "../api/orders";
import { getErrorMessage } from "../utils/errorHelpers";
import { useCompanySettings } from "../hooks/useCompanySettings";
import Badge from "../components/Badge";
import { CONTAINER_CLASS, CARD_CLASS } from "../utils/ui";

const STATUS_LABELS = {
  PENDING: "Order Placed",
  CONFIRMED: "Order Confirmed",
  PACKED: "Packed",
  PICKED: "Picked Up",
  SHIPPED: "Shipped",
  ARRIVED: "Arrived at Hub",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  BOOKED: "Shipment Booked",
  IN_TRANSIT: "In Transit",
  RETURNED: "Returned",
  FAILED: "Delivery Failed",
};

function fmtDateTime(d) {
  if (!d) return "Time not recorded";
  return new Date(d).toLocaleString("en-NP", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const DOT_PATTERN_CLASS =
  "absolute pointer-events-none bg-[radial-gradient(circle,_rgba(120,120,120,0.25)_1.5px,_transparent_1.5px)] bg-[length:16px_16px]";

const FEATURES = [
  {
    title: "Track Anywhere",
    text: "Track your shipment from anywhere, anytime.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 0h-12" />
      </svg>
    ),
  },
  {
    title: "Real-Time Updates",
    text: "Get instant updates on your package location.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.5 4.5L21.75 7.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 7.5h5.25v5.25" />
      </svg>
    ),
  },
  {
    title: "Delivery Estimates",
    text: "Know exactly when your package will arrive.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5V12l3 2.25" />
      </svg>
    ),
  },
];

export default function TrackOrderPage() {
  const [searchParams] = useSearchParams();
  const { company } = useCompanySettings();
  const initialCode = (searchParams.get("code") || "").trim().toUpperCase();
  const [code, setCode] = useState(initialCode);
  const [tracking, setTracking] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(initialCode));
  const resultRef = useRef(null);

  const fetchTracking = useCallback((value) => {
    ordersApi.trackOrder(value)
      .then(({ tracking: result }) => {
        setTracking(result);
        setError("");
      })
      .catch((e) => {
        setTracking(null);
        setError(getErrorMessage(e));
      })
      .finally(() => setLoading(false));
  }, []);

  // Support deep links like /track-order?code=<orderId> (e.g. from emails).
  useEffect(() => {
    if (initialCode) fetchTracking(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if ((tracking || error) && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [tracking, error]);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setTracking(null);
      setError("Please enter a tracking code.");
      return;
    }
    setLoading(true);
    fetchTracking(trimmed);
  }

  const supportEmail = company?.email || "";

  return (
    <div>
      {/* Hero — tracking form */}
      <section className="relative overflow-hidden bg-gray-100 dark:bg-gray-900">
        <div className={`${DOT_PATTERN_CLASS} top-0 left-0 w-56 h-40 [mask-image:linear-gradient(135deg,black,transparent)]`} />
        <div className={`${DOT_PATTERN_CLASS} bottom-0 right-0 w-72 h-48 [mask-image:linear-gradient(315deg,black,transparent)]`} />

        <div className={`${CONTAINER_CLASS} relative py-14 sm:py-20`}>
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-600">Order tracking made easy!</h1>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Enter tracking code of the order
            </p>

            <form onSubmit={handleSubmit} className="mt-6">
              <div className="relative">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Enter the tracking code..."
                  maxLength={10}
                  aria-label="Tracking code"
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md pl-4 pr-11 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="submit"
                  aria-label="Track order"
                  disabled={loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-600 hover:text-brand-700 disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full bg-brand-600 text-white rounded-md py-2.5 text-sm font-bold uppercase tracking-wide hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Tracking…" : "Track Order"}
              </button>
            </form>

            <p className="mt-5 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              To track the parcels, enter the correct{" "}
              <span className="text-brand-600 font-medium">Tracking ID</span>{" "}
              from your order confirmation email or My Orders page (Example:{" "}
              <span className="text-brand-600 font-mono">2F73FE0FF0</span>).
              <br />
              Then press <span className="text-brand-600 font-medium">Track Order</span> to track your orders.
            </p>
          </div>

          {/* Result / error */}
          <div ref={resultRef} className="max-w-2xl mx-auto">
            {error && (
              <div className="mt-8 flex items-start gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-3 dark:bg-red-950/40 dark:border-red-900 dark:text-red-400" role="alert">
                <svg className="w-5 h-5 flex-shrink-0 mt-px" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3h.008v.008H12v-.008ZM12 3l9 16.5H3L12 3Z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {tracking && (
              <div className={`mt-8 ${CARD_CLASS} p-5 sm:p-6 text-left`}>
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400">Tracking ID</p>
                    <p className="text-sm font-mono text-gray-700 dark:text-gray-300 truncate">{tracking.trackingId}</p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">
                        {tracking.itemCount} item{tracking.itemCount !== 1 ? "s" : ""}
                        {tracking.carrier ? ` · via ${tracking.carrier}` : ""}
                      </p>
                      <Badge kind="order" status={tracking.status} />
                    </div>
                  </div>
                </div>

                <ol className="mt-5">
                  {tracking.events.map((event, i) => {
                    const isLatest = i === tracking.events.length - 1;
                    return (
                      <li key={`${event.status}-${i}`} className="relative flex gap-4 pb-6 last:pb-0">
                        {i < tracking.events.length - 1 && (
                          <span className="absolute left-[7px] top-5 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
                        )}
                        <span
                          className={`relative mt-1 w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                            isLatest
                              ? "bg-brand-600 border-brand-600 ring-4 ring-brand-100 dark:ring-brand-900"
                              : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                          }`}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold ${isLatest ? "text-brand-600" : "text-gray-800 dark:text-gray-200"}`}>
                            {STATUS_LABELS[event.status] || event.status.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{fmtDateTime(event.occurredAt)}</p>
                          {event.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{event.description}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white dark:bg-gray-950">
        <div className={`${CONTAINER_CLASS} py-12 sm:py-16`}>
          <h2 className="text-xl sm:text-2xl font-bold text-brand-600 text-center">Our Tracking Features</h2>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-10 max-w-4xl mx-auto">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="flex justify-center text-brand-600">{feature.icon}</div>
                <h3 className="mt-3 text-sm font-bold text-gray-900 dark:text-white">{feature.title}</h3>
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 max-w-[220px] mx-auto">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Need help */}
      <section className="bg-gray-100 dark:bg-gray-900">
        <div className={`${CONTAINER_CLASS} py-10 sm:py-12 text-center`}>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Need Help?</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Contact our support team for assistance</p>
          <a
            href={supportEmail ? `mailto:${supportEmail}` : "/terms"}
            className="mt-4 inline-flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-800 dark:text-gray-200 hover:border-brand-400 transition-colors"
          >
            <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25h.008v.008H12V8.25Zm0 3v4.5" />
            </svg>
            Contact Support
          </a>
        </div>
      </section>
    </div>
  );
}
