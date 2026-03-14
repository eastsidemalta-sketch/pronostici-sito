import type { Badge18Config } from "@/lib/footerDisclaimerConfig";
import { getBadge18Config } from "@/lib/footerDisclaimerConfig";

const SIZE_CLASSES = {
  sm: "h-5 w-5 text-[9px]",
  md: "h-7 w-7 text-[11px]",
  lg: "h-9 w-9 text-[13px]",
} as const;

/** Logo 18+ rotondo per disclaimer footer - responsabile gambling */
export default function FooterDisclaimer18Plus({ className }: { className?: string }) {
  const badge = getBadge18Config();
  const size = badge.size ?? "md";
  const text = badge.text ?? "18+";
  const color = badge.color ?? "var(--accent)";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${SIZE_CLASSES[size]} ${className ?? ""}`}
      style={{ backgroundColor: /^#[0-9A-Fa-f]{3,8}$/.test(color) ? color : "var(--accent)" }}
      aria-hidden
    >
      <svg
        viewBox="0 0 28 28"
        className="h-full w-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          fill="white"
          fontSize={size === "sm" ? 9 : size === "lg" ? 13 : 11}
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
        >
          {text}
        </text>
      </svg>
    </span>
  );
}
