import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Technician = {
  id: number;
  name: string;
  pin: string;
  role: "technician" | "manager";
  isActive: boolean;
  createdAt: string;
};

type AuthContextType = {
  technician: Technician | null;
  login: (tech: Technician) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("currentTechnician").then(data => {
      if (data) {
        try { setTechnician(JSON.parse(data)); } catch { }
      }
      setIsLoading(false);
    });
  }, []);

  const login = async (tech: Technician) => {
    await AsyncStorage.setItem("currentTechnician", JSON.stringify(tech));
    setTechnician(tech);
  };

  const logout = async () => {
    await AsyncStorage.removeItem("currentTechnician");
    setTechnician(null);
  };

  return (
    <AuthContext.Provider value={{ technician, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
