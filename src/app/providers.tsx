"use client";

import { type ReactNode } from "react";
import { AuthProvider } from "@/hooks/useAuth";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen h-full flex flex-col">
        <main className="flex-1 min-h-0">{children}</main>
      </div>
    </AuthProvider>
  );
}
