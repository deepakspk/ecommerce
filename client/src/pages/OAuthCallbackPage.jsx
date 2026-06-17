import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function OAuthCallbackPage() {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function completeSignIn() {
      const token = searchParams.get("token");
      if (!token) {
        if (!ignore) setError("Missing authentication token.");
        return;
      }
      const user = await loginWithToken(token);
      if (ignore) return;
      if (user) {
        navigate("/");
      } else {
        setError("Could not complete sign-in. Please try logging in again.");
      }
    }

    completeSignIn();
    return () => {
      ignore = true;
    };
  }, [searchParams, loginWithToken, navigate]);

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Sign-in failed</h1>
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
        <Link to="/login" className="text-blue-600 hover:underline text-sm mt-4 inline-block">
          Back to login
        </Link>
      </div>
    );
  }

  return <p className="text-center py-24 text-gray-500">Signing you in...</p>;
}
