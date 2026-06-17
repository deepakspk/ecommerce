import { useEffect, useState, useCallback } from "react";
import AuthContext from "./AuthContext";
import * as authApi from "../api/auth";
import { getToken, setToken, clearToken } from "../utils/storage";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(getToken());
  const [loading, setLoading] = useState(true);

  const applyAuthResult = useCallback((result) => {
    setToken(result.token);
    setTokenState(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const refreshMe = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      return null;
    }
    try {
      const { user: me } = await authApi.getMe();
      setUser(me);
      return me;
    } catch {
      clearToken();
      setTokenState(null);
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function syncUser() {
      await refreshMe();
      if (!ignore) setLoading(false);
    }
    syncUser();
    return () => {
      ignore = true;
    };
  }, [refreshMe]);

  const signup = useCallback(
    async (data) => applyAuthResult(await authApi.signup(data)),
    [applyAuthResult]
  );

  const login = useCallback(
    async (data) => applyAuthResult(await authApi.login(data)),
    [applyAuthResult]
  );

  const loginWithOtp = useCallback(
    async (phone, code) => applyAuthResult(await authApi.verifyOtp(phone, code)),
    [applyAuthResult]
  );

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setUser(null);
  }, []);

  const loginWithToken = useCallback(
    async (rawToken) => {
      setToken(rawToken);
      setTokenState(rawToken);
      return refreshMe();
    },
    [refreshMe]
  );

  const value = {
    user,
    token,
    loading,
    signup,
    login,
    loginWithOtp,
    loginWithToken,
    logout,
    refreshMe,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
