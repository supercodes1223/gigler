import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  className?: string;
};

export function SectionHeader({ eyebrow, title, subtitle, className }: SectionHeaderProps) {
  return (
    <div className={cn("mx-auto max-w-2xl text-center", className)}>
      <p className="text-xs font-medium uppercase tracking-[0.28em] text-foreground/50">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-balance text-base leading-relaxed text-foreground/65 md:text-lg">
          {subtitle}
        </p>
      )}
    </div>
  );
}
