"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { HitaAPI, createHitaAPI } from "@hita/shared";

const APIContext = createContext<HitaAPI | null>(null);

export function APIProvider({ children }: { children: ReactNode }) {
  const api = useMemo(
    () => createHitaAPI(process.env.NEXT_PUBLIC_API_URL),
    []
  );
  return <APIContext.Provider value={api}>{children}</APIContext.Provider>;
}

export function useAPI(): HitaAPI {
  const api = useContext(APIContext);
  if (!api) throw new Error("useAPI must be used within <APIProvider>");
  return api;
}
