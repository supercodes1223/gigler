"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { useReturnHome } from "@/components/GigStatusProvider";

export default function BrandLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const onReturnHome = useReturnHome();
  return (
    <Link href="/" onClick={onReturnHome} className={className}>
      {children}
    </Link>
  );
}
