import { cn } from "@/lib/utils";

/**
 * Logo značky — malá "app ikona" v iOS štýle: indigo gradient + náznak
 * match ringu (podpisový prvok z UI_UX.md).
 */
export function BrandMark({
  className,
  size = 32,
}: {
  className?: string;
  size?: number;
}) {
  const iconSize = Math.round(size * 0.5);
  return (
    <div
      aria-hidden="true"
      style={{ width: size, height: size, borderRadius: size * 0.3 }}
      className={cn(
        "flex items-center justify-center bg-gradient-to-b from-[#524de8] to-[#3b36e0] shadow-[0_2px_10px_rgb(59_54_224/0.35),inset_0_1px_0_rgb(255_255_255/0.25)]",
        className
      )}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 16 16"
        fill="none"
      >
        <circle
          cx="8"
          cy="8"
          r="5.5"
          stroke="white"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeDasharray="26 9"
          transform="rotate(-90 8 8)"
        />
      </svg>
    </div>
  );
}
