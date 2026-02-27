import Link from "next/link";

import { BrandMark } from "@/components/layout/brand-mark";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  href?: string;
  className?: string;
  labelClassName?: string;
  iconClassName?: string;
};

export function BrandLogo({
  href = "/",
  className,
  labelClassName,
  iconClassName,
}: BrandLogoProps) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative inline-flex size-9 items-center justify-center overflow-hidden rounded-lg border border-white/25 bg-gradient-to-br from-white/10 to-white/0 text-accent",
          iconClassName
        )}
        aria-hidden="true"
      >
        <BrandMark className="size-5" />
      </span>
      <span className={cn("headline text-2xl text-text-primary", labelClassName)}>AnswerScope</span>
    </Link>
  );
}
