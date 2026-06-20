import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import * as authApi from "../api/auth";
import { FormError, FieldError } from "../components/FormError";
import { getErrorMessage, getFieldErrors } from "../utils/errorHelpers";
import { isValidPassword } from "../utils/validators";
import { INPUT_CLASS, LABEL_CLASS, BUTTON_PRIMARY_FULL, H1_CLASS } from "../utils/ui";

export default function ResetPasswordPage() {
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setGeneralError("");
    const errors = {};
    if (!isValidPassword(password)) errors.password = "Password must be at least 8 characters";
    if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setGeneralError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div>
        <h1 className={`${H1_CLASS} mb-4`}>Password reset</h1>
        <p className="text-sm text-gray-600 mb-4">
          Your password has been reset successfully.
        </p>
        <Link to="/login" className="text-brand-600 hover:underline text-sm">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className={`${H1_CLASS} mb-6`}>Reset password</h1>
      <FormError message={generalError} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={LABEL_CLASS}>New password</label>
          <input
            className={INPUT_CLASS}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <FieldError errors={fieldErrors} field="password" />
        </div>
        <div>
          <label className={LABEL_CLASS}>Confirm password</label>
          <input
            className={INPUT_CLASS}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <FieldError errors={fieldErrors} field="confirmPassword" />
        </div>
        <button type="submit" className={BUTTON_PRIMARY_FULL} disabled={submitting}>
          {submitting ? "Resetting..." : "Reset password"}
        </button>
      </form>
    </div>
  );
}
