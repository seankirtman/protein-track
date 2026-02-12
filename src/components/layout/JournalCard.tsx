import { type ReactNode } from "react";

interface JournalCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
}

export function JournalCard({ children, className = "", title }: JournalCardProps) {
  return (
    <div
      className={`rounded-lg border-2 border-leather/30 bg-white/80 p-6 shadow-journal ${className}`}
    >
      {title && (
        <h2 className="mb-4 font-heading text-lg font-bold text-ink border-b border-leather/20 pb-2">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}
