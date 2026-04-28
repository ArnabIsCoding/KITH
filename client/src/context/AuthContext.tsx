
import React, { createContext, useContext, ReactNode, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  signOut,
	onAuthStateChanged,
	signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
} from "firebase/auth";
import { auth } from "../firebase";
import User from "../models/UserModel";

type AuthContextType = {
  user:         User | null;
  loading:      boolean;
  googleSignIn: () => Promise<void>;
  logOut:       () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

		const init = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) {
            localStorage.setItem("accessToken", credential.accessToken);
          }
        }
      } catch (error) {
         console.error("[Auth] Redirect result error:", error);
      }
      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          const { displayName, email, uid, photoURL, metadata } = firebaseUser;
          setUser({
            id:          uid,
            name:        displayName || "",
            email:       email       || "",
            photoURL:    photoURL    || "",
            createdAt:   new Date(metadata.creationTime  || ""),
            lastLogin:   new Date(metadata.lastSignInTime || ""),
            homeAddress: "",
            workAddress: "",
            birthday:    null,
            gender:      "",
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      });
    };

    init();
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const googleSignIn = async () => {
    const provider = new GoogleAuthProvider();

    try {
      setLoading(true);
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        localStorage.setItem("accessToken", credential.accessToken);
      }
    } catch (error: any) {
      const code = error?.code ?? "";
      if (code === "auth/popup-blocked") {
        console.warn("[Auth] Popup blocked. Falling back to redirect...");
        await signInWithRedirect(auth, provider);
        return;
      }

      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      ) {
        console.info(`[Auth] Popup dismissed (${code}) — user can try again.`);
      } else {
        console.error("[Auth] Sign-in error:", code, error?.message);
      }

      setLoading(false);
      throw error;
    }
  };

  const logOut = async () => {
    setLoading(true);
    try {
      localStorage.removeItem("accessToken");
      await signOut(auth);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, googleSignIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const UserAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("UserAuth must be used within AuthContextProvider");
  return context;
};
