import { type ReactNode } from "react";

interface JournalCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
}

export function JournalCard({ children, className = "", title }: JournalCardProps) {
  return (
    <div
      className={`rounded-lg border-2 border-leather/30 bg-white/80 p-6 shadow-journal min-w-0 overflow-hidden ${className}`}
    >
      {title && (
        <h2 className="mb-2 sm:mb-4 font-heading text-sm sm:text-lg font-bold text-ink border-b border-leather/20 pb-1.5 sm:pb-2">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}
