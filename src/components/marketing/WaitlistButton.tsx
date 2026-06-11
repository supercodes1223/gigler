"use client";

import { useState } from "react";
import { CheckCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLiquidGlass } from "@/components/ui/liquid-glass";
import { cn } from "@/lib/utils";

type WaitlistButtonProps = {
  size?: "sm" | "default" | "lg";
  variant?: "default" | "secondary" | "ghost" | "outline";
  className?: string;
  label?: string;
};

export function WaitlistButton({
  size = "default",
  variant = "default",
  className,
  label = "Join the waitlist",
}: WaitlistButtonProps) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // Refraction on Chromium; elsewhere the dialog keeps its frosted classes.
  const {
    ref: glassRef,
    style: glassStyle,
    filter: glassFilter,
  } = useLiquidGlass<HTMLDivElement>({
    blur: 14,
    saturate: 1.6,
    background: "rgba(255, 255, 255, 0.62)",
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setSubmitted(false);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Prototype: success state only — no backend wired yet.
    setSubmitted(true);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {/* hover:bg-primary overrides the variant's bg-primary/80 — the fill
            stays solid; the hover signal is the sheen sweep instead. */}
        <Button
          size={size}
          variant={variant}
          className={cn("relative overflow-hidden rounded-full hover:bg-primary", className)}
        >
          {/* Sheen: a soft butter light band glides across once per hover.
              The transition only exists while hovered, so on mouse-out the
              band resets instantly instead of sweeping back through.
              Inline gradient: Tailwind v4 arbitrary gradient classes don't
              compile here (see memory). */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full duration-500 ease-out group-hover/button:translate-x-full group-hover/button:transition-transform"
            style={{
              background:
                "linear-gradient(105deg, transparent 30%, rgba(247,239,216,0.28) 50%, transparent 70%)",
            }}
          />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent
        ref={glassRef}
        style={glassStyle}
        showCloseButton={false}
        className="gap-6 rounded-[1.75rem] border-white/70 bg-white/85 p-7 shadow-2xl backdrop-blur-2xl sm:max-w-sm"
      >
        {glassFilter}
        <DialogClose asChild>
          <button
            type="button"
            className="absolute top-5 right-5 flex size-8 items-center justify-center rounded-full bg-foreground/[0.05] text-foreground/55 transition-colors hover:bg-foreground/10 hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
            <span className="sr-only">Close</span>
          </button>
        </DialogClose>
        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-spring-mint">
              <CheckCheck className="size-6 text-foreground" aria-hidden />
            </span>
            <DialogTitle className="text-xl font-semibold tracking-tight">
              You&apos;re on the list.
            </DialogTitle>
            <DialogDescription className="max-w-xs text-balance leading-relaxed">
              We&apos;ll email you the moment your assistant is ready to meet you.
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader className="gap-2 pr-10">
              <DialogTitle className="text-[22px] font-semibold tracking-tight">
                Join the waitlist
              </DialogTitle>
              <DialogDescription className="leading-relaxed">
                One email when it&apos;s your turn. No spam.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <Label htmlFor="waitlist-email" className="sr-only">
                Email address
              </Label>
              <Input
                id="waitlist-email"
                type="email"
                required
                autoFocus
                placeholder="you@example.com"
                className="h-12 rounded-full border-foreground/10 bg-white px-5 placeholder:text-foreground/35 focus-visible:border-ring/60 focus-visible:ring-ring/15"
              />
              <Button type="submit" className="h-12 rounded-full text-base">
                Save my spot
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
