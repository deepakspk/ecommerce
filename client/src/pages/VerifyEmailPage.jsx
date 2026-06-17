import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import * as authApi from "../api/auth";
import { getErrorMessage } from "../utils/errorHelpers";

export default function VerifyEmailPage() {
  const { token } = useParams();
  const [status, setStatus] = useState("pending");
  const [message, setMessage] = useState("");

  useEffect(() => {
    authApi
      .verifyEmail(token)
      .then((res) => {
        setStatus("success");
        setMessage(res.message);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(getErrorMessage(err));
      });
  }, [token]);

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">Email verification</h1>
      {status === "pending" && <p className="text-sm text-gray-600">Verifying your email...</p>}
      {status === "success" && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          {message}
        </p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {message}
        </p>
      )}
      <Link to="/login" className="text-blue-600 hover:underline text-sm mt-4 inline-block">
        Back to login
      </Link>
    </div>
  );
}
