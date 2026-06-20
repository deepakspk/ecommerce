import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { FormError, FieldError } from "../components/FormError";
import { getErrorMessage, getFieldErrors } from "../utils/errorHelpers";
import { isValidEmail } from "../utils/validators";
import { getGoogleAuthUrl } from "../api/auth";
import { INPUT_CLASS, LABEL_CLASS, BUTTON_PRIMARY_FULL, H1_CLASS } from "../utils/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const googleError = searchParams.get("error") === "google";

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function validate() {
    const errors = {};
    if (!isValidEmail(form.email)) errors.email = "A valid email is required";
    if (!form.password) errors.password = "Password is required";
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setGeneralError("");
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await login(form);
      navigate("/");
    } catch (err) {
      setGeneralError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className={`${H1_CLASS} mb-6`}>Log in</h1>
      <FormError message={googleError ? "Google sign-in failed. Please try again." : generalError} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={LABEL_CLASS}>Email</label>
          <input
            className={INPUT_CLASS}
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
          />
          <FieldError errors={fieldErrors} field="email" />
        </div>
        <div>
          <label className={LABEL_CLASS}>Password</label>
          <input
            className={INPUT_CLASS}
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
          />
          <FieldError errors={fieldErrors} field="password" />
        </div>
        <button type="submit" className={BUTTON_PRIMARY_FULL} disabled={submitting}>
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>

      <div className="flex justify-between text-sm mt-4">
        <Link to="/forgot-password" className="text-brand-600 hover:underline">
          Forgot password?
        </Link>
        <Link to="/otp-login" className="text-brand-600 hover:underline">
          Log in with phone OTP
        </Link>
      </div>

      <a
        href={getGoogleAuthUrl()}
        className="mt-4 block text-center border border-gray-300 rounded-md py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Continue with Google
      </a>

      <p className="text-sm text-gray-600 mt-4">
        Don't have an account?{" "}
        <Link to="/signup" className="text-brand-600 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
