import { Compass } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="ambient flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <LogoMark className="size-12" />
      <p className="mt-6 font-mono text-sm text-accent">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">This page doesn&apos;t exist</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">The link may be broken, or the page may have moved.</p>
      <div className="mt-6 flex gap-2">
        <ButtonLink href="/" variant="secondary">
          Home
        </ButtonLink>
        <ButtonLink href="/dashboard">
          <Compass /> Open dashboard
        </ButtonLink>
      </div>
    </main>
  );
}
