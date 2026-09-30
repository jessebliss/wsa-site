import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-32 w-full rounded-md border border-border bg-white px-3 py-2 text-base text-foreground outline-none ring-primary focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}
