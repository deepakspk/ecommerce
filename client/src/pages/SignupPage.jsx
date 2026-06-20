import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { FormError, FieldError } from "../components/FormError";
import { getErrorMessage, getFieldErrors } from "../utils/errorHelpers";
import { isValidEmail, isValidPassword, isValidNepaliPhone } from "../utils/validators";
import { INPUT_CLASS, LABEL_CLASS, BUTTON_PRIMARY_FULL, H1_CLASS } from "../utils/ui";

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function validate() {
    const errors = {};
    if (!form.name.trim()) errors.name = "Name is required";
    if (!isValidEmail(form.email)) errors.email = "A valid email is required";
    if (!isValidPassword(form.password)) errors.password = "Password must be at least 8 characters";
    if (form.phone && !isValidNepaliPhone(form.phone)) {
      errors.phone = "Phone must be a valid Nepali number (e.g. 98XXXXXXXX)";
    }
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
      await signup({ ...form, phone: form.phone || undefined });
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
      <h1 className={`${H1_CLASS} mb-6`}>Create an account</h1>
      <FormError message={generalError} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={LABEL_CLASS}>Name</label>
          <input
            className={INPUT_CLASS}
            name="name"
            value={form.name}
            onChange={handleChange}
          />
          <FieldError errors={fieldErrors} field="name" />
        </div>
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
        <div>
          <label className={LABEL_CLASS}>Phone (optional)</label>
          <input
            className={INPUT_CLASS}
            name="phone"
            placeholder="98XXXXXXXX"
            value={form.phone}
            onChange={handleChange}
          />
          <FieldError errors={fieldErrors} field="phone" />
        </div>
        <button type="submit" className={BUTTON_PRIMARY_FULL} disabled={submitting}>
          {submitting ? "Creating account..." : "Sign up"}
        </button>
      </form>
      <p className="text-sm text-gray-600 mt-4">
        Already have an account?{" "}
        <Link to="/login" className="text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
