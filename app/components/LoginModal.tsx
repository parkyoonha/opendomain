"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function LoginModal({ open, onClose }: Props) {
  const [loading, setLoading] = useState<"google" | "kakao" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const signIn = async (provider: "google" | "kakao") => {
    setError(null);
    setLoading(provider);
    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback`;
      // Supabase treats custom OIDC providers via the same signInWithOAuth
      // entrypoint. The `kakao` slug matches the Custom Auth Provider we
      // registered (Display Name = kakao).
      const { error: err } =
        provider === "kakao"
          ? await supabase.auth.signInWithOAuth({
              provider: "kakao" as "google", // Supabase types don't list kakao natively
              options: { redirectTo },
            })
          : await supabase.auth.signInWithOAuth({
              provider: "google",
              options: { redirectTo },
            });
      if (err) throw err;
      // Browser will redirect to the provider — no need to close modal here.
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-lg bg-neutral-900 p-6 shadow-2xl"
      >
        <div className="mb-1 text-[18px] font-bold text-text-primary">
          로그인
        </div>
        <p className="mb-5 text-[12px] text-text-muted">
          내역을 계정에 저장하려면 로그인하세요.
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => signIn("google")}
            disabled={loading !== null}
            className="flex h-11 items-center justify-center gap-2 rounded-md bg-white text-[14px] font-semibold text-black transition-opacity hover:bg-white/90 disabled:opacity-50"
          >
            <GoogleIcon />
            <span>{loading === "google" ? "이동 중..." : "Google로 계속"}</span>
          </button>

          <button
            onClick={() => signIn("kakao")}
            disabled={loading !== null}
            className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#FEE500] text-[14px] font-semibold text-[#3A1D1D] transition-opacity hover:brightness-95 disabled:opacity-50"
          >
            <KakaoIcon />
            <span>{loading === "kakao" ? "이동 중..." : "카카오로 계속"}</span>
          </button>
        </div>

        {error && (
          <p className="mt-3 text-[11px] leading-4 text-red-400">
            {error}
          </p>
        )}

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-md py-2 text-[12px] text-text-muted hover:text-text-primary"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.75 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

function KakaoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden fill="#3A1D1D">
      <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.79 1.85 5.24 4.63 6.6l-.94 3.44c-.08.31.26.55.53.38l4.13-2.72c.55.06 1.11.1 1.65.1 5.52 0 10-3.48 10-7.8S17.52 3 12 3z" />
    </svg>
  );
}
