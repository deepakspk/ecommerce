import { useState } from "react";
import { Link } from "react-router-dom";
import * as authApi from "../api/auth";
import { FormError, FieldError } from "../components/FormError";
import { getErrorMessage, getFieldErrors } from "../utils/errorHelpers";
import { isValidEmail } from "../utils/validators";
import { INPUT_CLASS, LABEL_CLASS, BUTTON_PRIMARY_FULL, H1_CLASS } from "../utils/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setGeneralError("");
    if (!isValidEmail(email)) {
      setFieldErrors({ email: "A valid email is required" });
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setGeneralError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto px-4 py-10 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
          <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0a2.25 2.25 0 0 0-2.25-2.25h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        </div>
        <h1 className={`${H1_CLASS} mt-5`}>Check your email</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
          If <span className="font-medium text-gray-800 dark:text-gray-200">{email}</span> is registered,
          we've sent it a password reset link. The link expires in 1 hour.
        </p>
        <p className="text-xs text-gray-400 mt-3">
          Can't find it? Check your spam folder, or{" "}
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="text-brand-600 hover:underline"
          >
            try another email
          </button>
          .
        </p>
        <Link
          to="/login"
          className="mt-6 inline-block bg-brand-600 text-white rounded-md py-2 px-6 text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className={H1_CLASS}>Forgot password</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 mb-6">
        Enter the email you signed up with and we'll send you a link to reset your password.
      </p>
      <FormError message={generalError} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={LABEL_CLASS}>Email</label>
          <input
            className={INPUT_CLASS}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoFocus
          />
          <FieldError errors={fieldErrors} field="email" />
        </div>
        <button type="submit" className={BUTTON_PRIMARY_FULL} disabled={submitting}>
          {submitting ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
        Remembered your password?{" "}
        <Link to="/login" className="text-brand-600 hover:underline">
          Back to login
        </Link>
      </p>
    </div>
  );
}
