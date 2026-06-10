"use client";

import { useState } from "react";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        <Button size={size} variant={variant} className={cn("rounded-full", className)}>
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-5 rounded-3xl border-white/70 bg-white/85 p-6 shadow-2xl backdrop-blur-2xl sm:max-w-sm">
        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-spring-mint">
              <CheckCheck className="size-6 text-foreground" aria-hidden />
            </span>
            <DialogTitle className="text-xl font-semibold tracking-tight">
              You&apos;re on the list.
            </DialogTitle>
            <DialogDescription className="max-w-xs text-balance">
              We&apos;ll email you the moment your assistant is ready to meet you.
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader className="gap-1.5 pr-8">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                Join the waitlist
              </DialogTitle>
              <DialogDescription className="truncate">
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
                className="h-11 rounded-xl bg-white/70"
              />
              <Button type="submit" size="lg" className="rounded-xl">
                Join the waitlist
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
