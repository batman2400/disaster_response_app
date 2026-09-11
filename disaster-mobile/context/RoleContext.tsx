import { createContext, useContext, useState, type ReactNode } from "react";

import type { Role } from "@/lib/types";

type RoleContextValue = {
  role: Role | null;
  setRole: (role: Role | null) => void;
};

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const value = useContext(RoleContext);
  if (!value) {
    throw new Error("useRole must be used inside RoleProvider");
  }
  return value;
}
