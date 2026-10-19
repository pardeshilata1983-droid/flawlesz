import * as React from "react"
import { cn } from "@/lib/utils"

export interface FieldProps extends React.ComponentProps<"div"> {
  orientation?: "vertical" | "horizontal"
}

const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, orientation = "vertical", ...props }, ref) => (
    <div
      ref={ref}
      data-slot="field"
      data-orientation={orientation}
      className={cn(
        "flex flex-col gap-1.5",
        orientation === "horizontal" && "flex-row items-center justify-between",
        className
      )}
      {...props}
    />
  )
)
Field.displayName = "Field"

const FieldContent = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="field-content"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  )
)
FieldContent.displayName = "FieldContent"

const FieldLabel = React.forwardRef<HTMLLabelElement, React.ComponentProps<"label">>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      data-slot="field-label"
      className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2", className)}
      {...props}
    />
  )
)
FieldLabel.displayName = "FieldLabel"

const FieldDescription = React.forwardRef<HTMLParagraphElement, React.ComponentProps<"p">>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      data-slot="field-description"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  )
)
FieldDescription.displayName = "FieldDescription"

export { Field, FieldContent, FieldLabel, FieldDescription }
