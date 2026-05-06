import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Senha do funcionário. Pode ser alterada aqui.
export const STAFF_PASSWORD = "admin123";
const KEY = "staff-mode-v1";

type StaffCtx = {
  isStaff: boolean;
  login: (password: string) => boolean;
  logout: () => void;
};

const Ctx = createContext<StaffCtx | null>(null);

export function StaffProvider({ children }: { children: ReactNode }) {
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsStaff(window.sessionStorage.getItem(KEY) === "1");
  }, []);

  const login = (password: string) => {
    if (password === STAFF_PASSWORD) {
      window.sessionStorage.setItem(KEY, "1");
      setIsStaff(true);
      return true;
    }
    return false;
  };
  const logout = () => {
    window.sessionStorage.removeItem(KEY);
    setIsStaff(false);
  };

  return <Ctx.Provider value={{ isStaff, login, logout }}>{children}</Ctx.Provider>;
}

export function useStaff() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStaff fora do StaffProvider");
  return c;
}
