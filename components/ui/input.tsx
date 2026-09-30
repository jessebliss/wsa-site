import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-md border border-border bg-white px-3 text-base text-foreground outline-none ring-primary focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}
