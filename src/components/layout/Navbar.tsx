"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export function Navbar() {
  const pathname = usePathname();
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  if (loading) {
    return (
      <nav className="border-b-2 border-leather/30 bg-parchment/95 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="h-8 w-32 animate-pulse rounded bg-aged" />
        </div>
      </nav>
    );
  }

  if (!user) {
    return (
      <nav className="border-b-2 border-leather/30 bg-parchment/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="font-heading text-xl font-bold text-ink">
            Iron Ledger
          </Link>
          <button
            onClick={signInWithGoogle}
            className="rounded-lg border-2 border-rust bg-rust px-4 py-2 font-medium text-white transition hover:bg-rust/90"
          >
            Sign in with Google
          </button>
        </div>
      </nav>
    );
  }

  const navLinks = [
    { href: "/", label: "Dashboard" },
    { href: "/journal", label: "Journal" },
    { href: "/nutrition", label: "Nutrition" },
    { href: "/photos", label: "Photos" },
    { href: "/profile", label: "Profile" },
  ];

  return (
    <nav className="border-b-2 border-leather/30 bg-parchment/95 backdrop-blur">
      <div className="mx-auto max-w-4xl px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="font-heading text-xl font-bold text-ink">
            Iron Ledger
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded px-3 py-2 text-sm font-medium transition ${
                  pathname === href
                    ? "bg-leather/20 text-ink"
                    : "text-ink/70 hover:bg-aged/50 hover:text-ink"
                }`}
              >
                {label}
              </Link>
            ))}
            <button
              onClick={signOut}
              className="ml-2 rounded px-3 py-2 text-sm text-ink/70 hover:bg-aged/50 hover:text-ink"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
