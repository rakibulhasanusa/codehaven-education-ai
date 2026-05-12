"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { cn } from "@/lib/utils";

export const ToastProvider = ToastPrimitive.Provider;
export const ToastViewport = ToastPrimitive.Viewport;

export function Toast({ className, ...props }: React.ComponentProps<typeof ToastPrimitive.Root>) {
  return <ToastPrimitive.Root className={cn("rounded-lg border bg-background px-4 py-3 shadow", className)} {...props} />;
}

export const ToastTitle = ToastPrimitive.Title;
export const ToastDescription = ToastPrimitive.Description;
