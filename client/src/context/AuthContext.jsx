import { createContext, useContext, useState, useEffect } from "react";
import API from "../api/axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);       // Must be null, NOT {}
  const [loading, setLoading] = useState(true);  // Must start true

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("habitforge_token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await API.get("/auth/profile");
        setUser(data);
      } catch {
        localStorage.removeItem("habitforge_token");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []); // Empty dependency array is critical here!

  const login = async (email, password) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const { data } = await API.post("/auth/login", { email, password, timezone });
    localStorage.setItem("habitforge_token", data.token);
    setUser(data);
    return data;
  };

  const register = async (name, email, password) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const { data } = await API.post("/auth/register", { name, email, password, timezone });
    return data;
  };

  const logout = () => {
    localStorage.removeItem("habitforge_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);