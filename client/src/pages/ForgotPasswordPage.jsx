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
      <div>
        <h1 className={`${H1_CLASS} mb-4`}>Check your email</h1>
        <p className="text-sm text-gray-600">
          If that email is registered, a password reset link has been sent.
        </p>
        <Link to="/login" className="text-brand-600 hover:underline text-sm mt-4 inline-block">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className={`${H1_CLASS} mb-6`}>Forgot password</h1>
      <FormError message={generalError} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={LABEL_CLASS}>Email</label>
          <input
            className={INPUT_CLASS}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <FieldError errors={fieldErrors} field="email" />
        </div>
        <button type="submit" className={BUTTON_PRIMARY_FULL} disabled={submitting}>
          {submitting ? "Sending..." : "Send reset link"}
        </button>
      </form>
    </div>
  );
}
