"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_SKIN, isSkinId, type SkinId } from "../games/skins";

interface SkinContextValue {
  skin: SkinId;
  setSkin: (id: SkinId) => void;
}

const STORAGE_KEY = "av_skin";

const SkinContext = createContext<SkinContextValue | null>(null);

function readStoredSkin(): SkinId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (isSkinId(raw)) return raw;
  } catch {}
  return DEFAULT_SKIN;
}

export function SkinProvider({ children }: { children: ReactNode }) {
  // El primer render usa la skin por defecto para evitar errores de hidratación.
  const [skin, setSkinState] = useState<SkinId>(DEFAULT_SKIN);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSkinState(readStoredSkin());
  }, []);

  const setSkin = useCallback((id: SkinId) => {
    setSkinState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  }, []);

  const value = useMemo(() => ({ skin, setSkin }), [skin, setSkin]);

  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>;
}

export function useSkin(): SkinContextValue {
  const ctx = useContext(SkinContext);
  if (!ctx) {
    throw new Error("useSkin debe usarse dentro de <SkinProvider>");
  }
  return ctx;
}
