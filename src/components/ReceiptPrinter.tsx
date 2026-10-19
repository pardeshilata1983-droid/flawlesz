"use client";

import {
  CheckCircleIcon,
  CircleNotchIcon,
} from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import {
  type ComponentPropsWithoutRef,
  createContext,
  type ReactNode,
  useContext,
} from "react";
import { cn } from "@/helpers/classname-helper";

export type ReceiptPrinterStage = "processing" | "printing" | "complete";
export type ReceiptFeedMotion = "smooth" | "stepped";

export type ReceiptPrinterRootProps = Omit<
  ComponentPropsWithoutRef<"section">,
  "children"
> & {
  animate?: boolean;
  children: ReactNode;
  feedMotion?: ReceiptFeedMotion;
  stage: ReceiptPrinterStage;
};

export type ReceiptPrinterMachineProps = ComponentPropsWithoutRef<"div">;
export type ReceiptPrinterHeaderProps = ComponentPropsWithoutRef<"div">;
export type ReceiptPrinterScreenProps = ComponentPropsWithoutRef<"div">;
export type ReceiptPrinterOutputProps = ComponentPropsWithoutRef<"div">;
export type ReceiptPrinterPaperProps = HTMLMotionProps<"article">;

export type ReceiptPrinterStatusProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> & {
  children?: ReactNode;
};

type ReceiptPrinterContextValue = {
  animate: boolean;
  feedMotion: ReceiptFeedMotion;
  shouldMove: boolean;
  stage: ReceiptPrinterStage;
};

const ReceiptPrinterContext = createContext<ReceiptPrinterContextValue | null>(
  null,
);

const statusLabels: Record<ReceiptPrinterStage, ReactNode> = {
  processing: "Processing your order",
  printing: "Printing your receipt",
  complete: "Order complete",
};

export function ReceiptPrinterRoot({
  animate = true,
  children,
  className,
  feedMotion = "smooth",
  stage,
  ...props
}: ReceiptPrinterRootProps) {
  const shouldReduceMotion = useReducedMotion();
  const shouldMove = animate && !shouldReduceMotion;

  return (
    <ReceiptPrinterContext.Provider
      value={{ animate, feedMotion, shouldMove, stage }}
    >
      <section
        className={cn("relative w-full max-w-sm", className)}
        {...props}
      >
        {children}
      </section>
    </ReceiptPrinterContext.Provider>
  );
}

export function ReceiptPrinterMachine({
  className,
  ...props
}: ReceiptPrinterMachineProps) {
  return (
    <div
      className={cn(
        "relative isolate w-full overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 p-6 pb-12 shadow-xl",
        className,
      )}
      {...props}
    />
  );
}

export function ReceiptPrinterHeader({
  className,
  ...props
}: ReceiptPrinterHeaderProps) {
  return <div className={cn("mb-6 text-center", className)} {...props} />;
}

export function ReceiptPrinterScreen({
  className,
  ...props
}: ReceiptPrinterScreenProps) {
  return <div className={cn("p-4 border-b border-stone-200", className)} {...props} />;
}

export function ReceiptPrinterOutput({
  className,
  ...props
}: ReceiptPrinterOutputProps) {
  return <div className={cn("relative w-full overflow-hidden", className)} {...props} />;
}

export function ReceiptPrinterStatus({
  children,
  className,
  ...props
}: ReceiptPrinterStatusProps) {
  const context = useContext(ReceiptPrinterContext);
  if (!context) throw new Error("ReceiptPrinterStatus must be used within ReceiptPrinterRoot");

  return (
    <div className={cn("flex items-center justify-center gap-2 text-sm font-medium text-stone-600", className)} {...props}>
      {context.stage === "processing" && <CircleNotchIcon className="animate-spin" />}
      {context.stage === "complete" && <CheckCircleIcon className="text-emerald-500" />}
      {children ?? statusLabels[context.stage]}
    </div>
  );
}

export function ReceiptPrinterPaper({
  className,
  ...props
}: ReceiptPrinterPaperProps) {
  const context = useContext(ReceiptPrinterContext);
  if (!context) throw new Error("ReceiptPrinterPaper must be used within ReceiptPrinterRoot");

  return (
    <motion.article
      initial={{ y: "-100%" }}
      animate={context.stage === "printing" ? { y: 0 } : { y: "-100%" }}
      transition={context.stage === "printing" ? { duration: 2, ease: "linear" } : { duration: 0.5 }}
      className={cn(
        "relative w-full rounded-b-lg bg-white p-4 shadow-inner",
        className,
      )}
      {...props}
    />
  );
}
