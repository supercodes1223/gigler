import type { ReactNode } from "react";
import { AmplifyProvider } from "@/components/AmplifyProvider";

export default function ShortCodeLayout({ children }: { children: ReactNode }) {
  return <AmplifyProvider>{children}</AmplifyProvider>;
}
