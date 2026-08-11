import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    api
      .get("/auth/me")
      .then((response) => {
        if (!ignore) {
          setUser(response.data.user);
        }
      })
      .catch(() => {
        if (!ignore) {
          setUser(null);
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Re-sync the signed-in user (and their role permissions) when the tab
  // regains focus. Permissions are role-based and an admin may change them
  // while a user is already logged in; without this the user would keep stale
  // rights — e.g. an agent just granted "Bookings: Create/Edit" wouldn't see
  // the edit button until a manual full reload. Silent: never logs the user
  // out on a transient error, only refreshes on success.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      api.get("/auth/me")
        .then((response) => setUser((prev) => (prev ? response.data.user : prev)))
        .catch(() => { /* keep current session on transient failure */ });
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      // Permission check used to show/hide action buttons. ADMIN always true.
      // action defaults to "read". Mirrors the server's guardModule logic.
      can(module, action = "read") {
        if (!user) return false;
        if (user.role === "ADMIN") return true;
        return Boolean(user.permissions?.[module]?.[action]);
      },
      async login(payload) {
        const response = await api.post("/auth/login", payload);
        setUser(response.data.user);
      },
      async logout() {
        await api.post("/auth/logout");
        setUser(null);
      }
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
