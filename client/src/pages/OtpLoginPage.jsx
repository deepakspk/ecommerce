import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import * as authApi from "../api/auth";
import { FormError, FieldError } from "../components/FormError";
import { getErrorMessage, getFieldErrors } from "../utils/errorHelpers";
import { isValidNepaliPhone, isValidOtpCode } from "../utils/validators";
import { INPUT_CLASS, LABEL_CLASS, BUTTON_PRIMARY_FULL, H1_CLASS } from "../utils/ui";

export default function OtpLoginPage() {
  const { loginWithOtp } = useAuth();
  const navigate = useNavigate();
  const [stage, setStage] = useState("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleRequestOtp(e) {
    e.preventDefault();
    setGeneralError("");
    if (!isValidNepaliPhone(phone)) {
      setFieldErrors({ phone: "Phone must be a valid Nepali number (e.g. 98XXXXXXXX)" });
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await authApi.requestOtp(phone);
      setStage("code");
    } catch (err) {
      setGeneralError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setGeneralError("");
    if (!isValidOtpCode(code)) {
      setFieldErrors({ code: "OTP must be 6 digits" });
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await loginWithOtp(phone, code);
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
      <h1 className={`${H1_CLASS} mb-6`}>Log in with phone OTP</h1>
      <FormError message={generalError} />

      {stage === "phone" ? (
        <form onSubmit={handleRequestOtp} className="space-y-4">
          <div>
            <label className={LABEL_CLASS}>Phone number</label>
            <input
              className={INPUT_CLASS}
              placeholder="98XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <FieldError errors={fieldErrors} field="phone" />
          </div>
          <button type="submit" className={BUTTON_PRIMARY_FULL} disabled={submitting}>
            {submitting ? "Sending OTP..." : "Send OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter the 6-digit code sent to {phone}.
          </p>
          <div>
            <label className={LABEL_CLASS}>OTP code</label>
            <input
              className={INPUT_CLASS}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <FieldError errors={fieldErrors} field="code" />
          </div>
          <button type="submit" className={BUTTON_PRIMARY_FULL} disabled={submitting}>
            {submitting ? "Verifying..." : "Verify and log in"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStage("phone");
              setCode("");
              setGeneralError("");
              setFieldErrors({});
            }}
            className="w-full text-sm text-gray-600 hover:text-gray-800"
          >
            Change phone number
          </button>
        </form>
      )}
    </div>
  );
}
