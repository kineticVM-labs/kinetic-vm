"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { machineSrc } from "@/lib/machines";

const SLIDES = [
  { slug: "arm-industrial", kicker: "Robot arm", text: "Pick-and-place, signed as the grip closes." },
  { slug: "vending-street", kicker: "Vending", text: "A sale becomes a row a buyer can check." },
  { slug: "drone-quad", kicker: "Drone", text: "Survey passes with a trail on Monad." },
] as const;

export function AuthScreen({
  mode,
  next,
  notice,
}: {
  mode: "login" | "signup";
  next: string;
  notice: string | null;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(notice);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const signup = mode === "signup";
  const slide = SLIDES[index] ?? SLIDES[0];

  useEffect(() => {
    if (reduce) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % SLIDES.length), 4000);
    return () => window.clearInterval(timer);
  }, [reduce]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(signup ? "/api/marketplace/auth/signup" : "/api/marketplace/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Sign-in failed.");
      router.push(next);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed.");
      setBusy(false);
    }
  }

  const switchHref = `/marketplace/login?mode=${signup ? "login" : "signup"}&next=${encodeURIComponent(next)}`;

  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-6 py-8 lg:grid-cols-2 lg:gap-14 lg:px-10">
      <section className="flex items-center justify-center">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-4xl font-semibold tracking-[-0.035em] text-ink">
            {signup ? "Create an account" : "Welcome back"}
          </h1>
          <p className="mt-3 text-[15px] leading-7 text-fg">
            {signup ? "Email and a password, or continue with Google." : "Log in with email, or continue with Google."}
          </p>

          <a href={`/api/marketplace/auth/google?next=${encodeURIComponent(next)}`} className="btn btn-secondary mt-8 w-full">
            <GoogleMark />
            Continue with Google
          </a>

          <div className="my-6 flex items-center gap-3 text-xs tracking-[0.14em] text-muted uppercase">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>

          <form className="space-y-4 text-left" onSubmit={(event) => void onSubmit(event)} noValidate>
            <div>
              <label htmlFor="email" className="text-sm font-medium text-ink">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="field mt-2 font-sans"
                placeholder="ada@example.com"
                aria-invalid={error ? true : undefined}
              />
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="password" className="text-sm font-medium text-ink">
                  Password
                </label>
                <button
                  type="button"
                  className="text-sm text-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={signup ? "new-password" : "current-password"}
                required
                minLength={8}
                className="field mt-2 font-sans"
                aria-invalid={error ? true : undefined}
              />
            </div>
            {error ? (
              <p className="text-sm leading-6 text-danger" role="alert">
                {error}
              </p>
            ) : null}
            <button type="submit" className="btn btn-primary w-full" disabled={busy} aria-busy={busy}>
              {busy ? "Signing in" : signup ? "Create account" : "Log in"}
            </button>
          </form>

          <p className="mt-6 text-sm text-muted">
            {signup ? "Already have an account?" : "New here?"}{" "}
            <Link href={switchHref} className="font-medium text-ink underline decoration-lilac-strong underline-offset-4 hover:text-purple-deep">
              {signup ? "Log in" : "Create an account"}
            </Link>
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center" aria-label="Machines">
        <div className="relative h-[65vh] w-full overflow-hidden rounded-[1.75rem]">
        <AnimatePresence>
          <motion.div
            key={slide.slug}
            className="absolute inset-0"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            <Image src={machineSrc(slide.slug)} alt="" fill priority={index === 0} sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-night/80 via-night/15 to-night/25" />
            <div className="absolute inset-x-0 bottom-0 p-8 sm:p-10">
              <p className="font-mono text-xs tracking-[0.16em] text-white/75 uppercase">{slide.kicker}</p>
              <p className="mt-2 max-w-sm text-2xl leading-snug font-medium tracking-[-0.03em] text-white">{slide.text}</p>
            </div>
          </motion.div>
        </AnimatePresence>
        </div>
      </section>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.03l2.99-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}
