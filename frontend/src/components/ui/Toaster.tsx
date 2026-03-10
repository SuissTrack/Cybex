'use client';

import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { cn } from '@/lib/utils';
import { useToastStore } from '@/hooks/useToast';

export function Toaster() {
  const { toasts, dismiss } = useToastStore();

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {toasts.map((toast) => (
        <ToastPrimitive.Root
          key={toast.id}
          className={cn(
            'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full',
            toast.variant === 'destructive'
              ? 'destructive border-red-500/50 bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100'
              : 'border-border bg-background text-foreground',
          )}
          open
          onOpenChange={() => dismiss(toast.id)}
        >
          <div className="grid gap-1">
            {toast.title && <ToastPrimitive.Title className="text-sm font-semibold">{toast.title}</ToastPrimitive.Title>}
            {toast.description && <ToastPrimitive.Description className="text-sm opacity-90">{toast.description}</ToastPrimitive.Description>}
          </div>
          <ToastPrimitive.Close className="absolute right-2 top-2 rounded-md p-1 opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100">
            ✕
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]" />
    </ToastPrimitive.Provider>
  );
}
