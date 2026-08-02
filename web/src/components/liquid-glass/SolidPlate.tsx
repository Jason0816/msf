import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type SolidPlateProps = HTMLAttributes<HTMLDivElement> & {
  strong?: boolean;
};

export const SolidPlate = forwardRef<HTMLDivElement, SolidPlateProps>(function SolidPlate(
  { strong = false, className, ...props },
  ref
) {
  return <div ref={ref} className={cn("gary-solid-plate", strong && "gary-solid-plate--strong", className)} {...props} />;
});
