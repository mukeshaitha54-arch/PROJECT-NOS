"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap & ESC key
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement;
    dialogRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`relative w-full ${SIZE_CLASSES[size]} rounded-2xl bg-[#ffffff] border border-[#eadfd5] shadow-2xl outline-none
          animate-in fade-in zoom-in-95 duration-200`}
      >
        {(title || description) && (
          <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-[#eadfd5]">
            <div>
              {title && (
                <h2
                  id="modal-title"
                  className="text-base font-semibold text-[#211a16]"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-0.5 text-xs text-[#75685f]">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-1.5 rounded-lg text-[#75685f] hover:text-[#211a16] hover:bg-[#fff7f0] transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="px-6 py-5 text-[#211a16]">{children}</div>
      </div>
    </div>
  );
}
