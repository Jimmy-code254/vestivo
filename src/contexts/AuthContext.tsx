import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  adminLoading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  adminLoading: true,
  isAdmin: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const authEventVersion = useRef(0);
  const roleRequestVersion = useRef(0);

  useEffect(() => {
    const applySession = (nextSession: Session | null) => {
      const version = ++authEventVersion.current;
      const nextUser = nextSession?.user ?? null;
      setSession(nextSession);
      setUser(nextUser);
      setLoading(false);

      if (!nextUser) {
        roleRequestVersion.current += 1;
        setIsAdmin(false);
        setAdminLoading(false);
        return;
      }

      const requestVersion = ++roleRequestVersion.current;
      setIsAdmin(false);
      setAdminLoading(true);
      void supabase.rpc("has_role", { _role: "admin" }).then(({ data, error }) => {
        if (version !== authEventVersion.current || requestVersion !== roleRequestVersion.current) return;
        if (error) {
          console.error("Failed to check admin role", error);
          setIsAdmin(false);
        } else {
          setIsAdmin(Boolean(data));
        }
        setAdminLoading(false);
      }).catch((error: unknown) => {
        if (version !== authEventVersion.current || requestVersion !== roleRequestVersion.current) return;
        console.error("Failed to check admin role", error);
        setIsAdmin(false);
        setAdminLoading(false);
      });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    const initialVersion = authEventVersion.current;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (authEventVersion.current !== initialVersion) return;
      if (error) {
        console.error("Failed to load auth session", error);
        setLoading(false);
        setAdminLoading(false);
        return;
      }
      applySession(data.session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, adminLoading, isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
