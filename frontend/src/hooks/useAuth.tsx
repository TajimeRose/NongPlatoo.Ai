import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth, FirebaseError } from "@/lib/firebase";

type SignUpPayload = {
  email: string;
  password: string;
  displayName?: string;
};

type AuthContextValue = {
  user: User | null;
  initializing: boolean;
  authLoading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: SignUpPayload) => Promise<void>;
  signOutUser: () => Promise<void>;
  resetAuthError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const formatFirebaseError = (error: unknown) => {
  if (error instanceof FirebaseError) {
    const code = error.code;
    if (code === "auth/invalid-credential" || code === "auth/invalid-email" || code === "auth/user-not-found") {
      return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
    }
    if (code === "auth/email-already-in-use") {
      return "อีเมลนี้ถูกใช้งานแล้ว";
    }
    if (code === "auth/weak-password") {
      return "รหัสผ่านควรมีความยาวอย่างน้อย 6 ตัวอักษร";
    }
    if (code === "auth/too-many-requests") {
      return "พยายามเข้าสู่ระบบบ่อยเกินไป โปรดลองใหม่อีกครั้ง";
    }
  }
  return "ไม่สามารถดำเนินการได้ กรุณาลองใหม่";
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setAuthError(formatFirebaseError(error));
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  const signUp = async ({ email, password, displayName }: SignUpPayload) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(credential.user, { displayName });
      }
    } catch (error) {
      setAuthError(formatFirebaseError(error));
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  const signOutUser = async () => {
    setAuthError(null);
    await signOut(auth);
  };

  const resetAuthError = () => setAuthError(null);

  const value = useMemo(
    () => ({
      user,
      initializing,
      authLoading,
      authError,
      signIn,
      signUp,
      signOutUser,
      resetAuthError,
    }),
    [user, initializing, authLoading, authError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
