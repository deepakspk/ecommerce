import { useState, useEffect } from "react";
import * as questionsApi from "../api/questions";
import { getErrorMessage } from "../utils/errorHelpers";
import { useAuth } from "../hooks/useAuth";
import { Link } from "react-router-dom";

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-NP", { day: "numeric", month: "short", year: "numeric" });

function AdminAnswerForm({ productId, question, onAnswered }) {
  const [text, setText] = useState(question.answer || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const data = await questionsApi.answerQuestion(productId, question._id, { answer: text.trim() });
      onAnswered(data.question);
      setOpen(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 text-xs font-medium text-brand-600 hover:text-brand-700 underline-offset-2 hover:underline"
      >
        {question.answer ? "Edit answer" : "Answer this question"}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder="Write your answer…"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || !text.trim()}
          className="px-4 py-1.5 bg-brand-600 text-white text-xs font-semibold rounded-md hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? "Saving…" : question.answer ? "Update answer" : "Post answer"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function ProductQuestions({ productId }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const [questions, setQuestions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  const [questionText, setQuestionText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      try {
        const data = await questionsApi.getQuestions(productId, { page });
        if (!ignore) {
          setQuestions(data.questions);
          setTotal(data.total);
          setPages(data.pages);
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

  async function handleAsk(e) {
    e.preventDefault();
    if (!questionText.trim()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await questionsApi.createQuestion(productId, { question: questionText.trim() });
      setSubmitted(true);
      setQuestionText("");
      setShowForm(false);
      setPage(1);
      setRefreshTick((t) => t + 1);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function handleAnswered(updatedQ) {
    setQuestions((prev) => prev.map((q) => (q._id === updatedQ._id ? updatedQ : q)));
  }

  return (
    <div>
      {/* Ask a question */}
      <div className="mb-6">
        {!user ? (
          <p className="text-sm text-gray-500">
            <Link to="/login" className="text-brand-600 hover:underline font-medium">Log in</Link>
            {" "}to ask a question about this product.
          </p>
        ) : showForm ? (
          <form onSubmit={handleAsk} className="space-y-3">
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="What would you like to know about this product?"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
            <p className="text-xs text-gray-400 text-right">{questionText.length}/500</p>
            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting || !questionText.trim()}
                className="px-5 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-50"
              >
                {submitting ? "Posting…" : "Post Question"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setSubmitError(""); }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Ask a Question
          </button>
        )}
        {submitted && !showForm && (
          <p className="mt-2 text-sm text-green-600 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Your question has been posted!
          </p>
        )}
      </div>

      {/* Question list */}
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">No questions yet. Be the first to ask!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <div key={q._id} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Question */}
              <div className="flex items-start gap-3 p-4 bg-gray-50">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                  Q
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{q.question}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {q.userId?.name || "Customer"} · {fmtDate(q.createdAt)}
                  </p>
                  {isAdmin && (
                    <AdminAnswerForm productId={productId} question={q} onAnswered={handleAnswered} />
                  )}
                </div>
              </div>

              {/* Answer */}
              {q.answer && (
                <div className="flex items-start gap-3 p-4 border-t border-gray-100 bg-white">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">
                    A
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{q.answer}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {q.answeredById?.name || "Store"} · {q.answeredAt ? fmtDate(q.answeredAt) : ""}
                    </p>
                  </div>
                </div>
              )}

              {/* Unanswered badge */}
              {!q.answer && !isAdmin && (
                <div className="px-4 py-2.5 border-t border-gray-100 bg-amber-50">
                  <p className="text-xs text-amber-600 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Awaiting answer from the store
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:border-brand-400 transition-colors"
          >
            Previous
          </button>
          <span className="px-2 py-1.5 text-sm text-gray-500">Page {page} of {pages}</span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:border-brand-400 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
