"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { Toast, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

type ToastItem = { id: string; title: string; description?: string };
type ToasterContextType = { push: (title: string, description?: string) => void };

const ToasterContext = createContext<ToasterContextType | null>(null);

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const value = useMemo(
    () => ({
      push: (title: string, description?: string) => {
        const id = crypto.randomUUID();
        setItems((prev) => [...prev, { id, title, description }]);
      },
    }),
    []
  );

  return (
    <ToasterContext.Provider value={value}>
      <ToastProvider swipeDirection="right">
        {children}
        {items.map((item) => (
          <Toast key={item.id} open onOpenChange={(open) => !open && setItems((prev) => prev.filter((x) => x.id !== item.id))}>
            <ToastTitle>{item.title}</ToastTitle>
            {item.description ? <ToastDescription>{item.description}</ToastDescription> : null}
          </Toast>
        ))}
        <ToastViewport className="fixed bottom-4 right-4 z-[100] flex w-96 max-w-[95vw] flex-col gap-2" />
      </ToastProvider>
    </ToasterContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToasterContext);
  if (!context) throw new Error("useToast must be used within ToasterProvider.");
  return context;
}
