"use client";

import { motion, AnimatePresence } from "framer-motion";

interface Props {
  show: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
}

export function ResultsPopup({ show, onDismiss, children }: Props) {
  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            className="fixed inset-0 z-50"
            style={{ background: "rgba(2,11,24,0.75)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onDismiss}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-5 pointer-events-none"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <div
              className="relative w-full max-w-md pointer-events-auto"
              onClick={e => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={onDismiss}
                className="absolute -top-3 -right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full"
                style={{
                  background: "rgba(10,61,107,0.9)",
                  border: "1px solid rgba(230,251,255,0.15)",
                  color: "rgba(230,251,255,0.6)",
                  fontSize: "1rem",
                  fontFamily: "var(--font-dm-sans)",
                }}
                aria-label="Dismiss"
              >
                ✕
              </button>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
