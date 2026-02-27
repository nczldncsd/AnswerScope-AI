import { Microscope } from "lucide-react";

import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <span className={cn("relative inline-block size-5", className)} aria-hidden="true">
      <svg viewBox="0 0 24 24" className="absolute inset-0 size-full" fill="none">
        <path
          d="M8 4H4V8M16 4H20V8M20 16V20H16M8 20H4V16"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <Microscope className="absolute inset-[23%] size-[54%] stroke-[2.3]" />
    </span>
  );
}
