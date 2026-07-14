"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

interface AuthShellProps {
  children: ReactNode;
  heading: string;
  subtitle: string;
  footerText: string;
  footerLinkText: string;
  footerHref: string;
}

export function AuthShell({
  children,
  heading,
  subtitle,
  footerText,
  footerLinkText,
  footerHref,
}: AuthShellProps) {
  return (
    <div className="min-h-screen w-full bg-cover bg-center bg-no-repeat flex items-center justify-center p-4 md:p-8" style={{ backgroundImage: "url('/cdn/auth-bg.jpg')" }}>
      <div className="w-full max-w-6xl min-h-[85vh] md:min-h-[720px] rounded-2xl overflow-hidden shadow-2xl bg-white flex flex-col md:flex-row">
        {/* Left pane */}
        <div className="hidden md:flex md:w-[55%] relative overflow-hidden">
          <img
            src="/cdn/auth-side.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* TWEAK POINTS: color hex and alpha.
              Warmer: #5c3317. Cooler: #3a2410. Heavier: /65. Lighter: /40. */}
          <div className="absolute inset-0 bg-[#4a2c14]/55" aria-hidden />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
            aria-hidden
          />
          <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-neutral-900 flex items-center justify-center text-white text-sm font-bold">
                L
              </div>
              <span className="text-lg font-semibold">LeadPilot AI</span>
            </div>

            <div className="flex flex-col gap-6">
              <p className="text-2xl font-medium leading-snug max-w-md">
                &ldquo;LeadPilot AI turned our website into a 24/7 sales
                rep&nbsp;&mdash; every visitor gets an instant, on-brand answer,
                and every qualified lead lands in our CRM.&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-white/20" aria-hidden />
                <div>
                  <div className="text-sm font-medium">Priya Menon</div>
                  <div className="text-xs text-white/70">
                    Founder @ Northlight Studio
                  </div>
                </div>
              </div>
              <div className="space-y-2 mt-4">
                {[
                  "99.9% uptime on serverless infrastructure",
                  "Trained on your docs, website, and socials",
                  "One script tag \u2014 live on your site in minutes",
                ].map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-2 text-sm text-white/90"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs text-white/60">
              &copy; 2026 LeadPilot AI. All rights reserved.
            </div>
          </div>
        </div>

        {/* Right pane */}
        <div className="flex-1 md:w-[45%] bg-white flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-sm space-y-6">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-neutral-900 flex items-center justify-center text-white text-sm font-bold">
                L
              </div>
              <span className="text-base font-semibold text-neutral-900">
                LeadPilot AI
              </span>
            </div>

            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">
                {heading}
              </h1>
              <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>
            </div>

            {children}

            <div className="flex items-center gap-3 text-xs text-neutral-500">
              <div className="flex-1 h-px bg-neutral-200" />
              Or continue with
              <div className="flex-1 h-px bg-neutral-200" />
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={(e) => e.preventDefault()}
                className="w-full h-11 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-sm font-medium text-neutral-800 flex items-center justify-center gap-2 transition-colors"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Connect with Google
              </button>
              <button
                type="button"
                onClick={(e) => e.preventDefault()}
                className="w-full h-11 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-sm font-medium text-neutral-800 flex items-center justify-center gap-2 transition-colors"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.18 1.83 1.18 3.09 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.67.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
                </svg>
                Continue with GitHub
              </button>
            </div>

            <div className="text-center text-sm text-neutral-600">
              {footerText}
              <Link
                href={footerHref}
                className="underline underline-offset-4 hover:text-neutral-900"
              >
                {footerLinkText}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
