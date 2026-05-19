import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type FC,
} from "react";
import { toast } from "react-toastify";
import type { AuthContextType, AuthUser, LoginResponseData } from "@/types";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "token";
const EXPIRY_KEY = "token_expiry";
const REFRESH_KEY = "refresh_token";
const USER_KEY = "auth_user";

const getValidToken = (): string | null => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const expiry = sessionStorage.getItem(EXPIRY_KEY);
  if (token && expiry && Date.now() < Number(expiry)) return token;
  return sessionStorage.getItem(REFRESH_KEY) ? token : null;
};

const getStoredUser = (): AuthUser | null => {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
};

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(getValidToken());
  const [user, setUser] = useState<AuthUser | null>(getStoredUser());

  const login = (data: LoginResponseData): void => {
    // Access token ~15m; we mark expiry slightly earlier to pre-empt 401.
    sessionStorage.setItem(TOKEN_KEY, data.accessToken);
    sessionStorage.setItem(
      EXPIRY_KEY,
      String(Date.now() + 14 * 60 * 1000)
    );
    sessionStorage.setItem(REFRESH_KEY, data.refreshToken);
    sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setToken(data.accessToken);
    setUser(data.user);
  };

  const logout = (): void => {
    sessionStorage.clear();
    setToken(null);
    setUser(null);
    toast.success("Logged out successfully");
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
