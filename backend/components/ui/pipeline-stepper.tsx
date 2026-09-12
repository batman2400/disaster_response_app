import { Check, LoaderCircle } from "lucide-react";

import { cn } from "@/lib/cn";

export type StepState = "idle" | "running" | "pass" | "fail";

export type PipelineStep = {
  id: string;
  title: string;
  detail: string;
  state: StepState;
};

export function PipelineStepper({ steps }: { steps: PipelineStep[] }) {
  const done = steps.filter((step) => step.state === "pass" || step.state === "fail").length;
  const progress = steps.length ? (done / steps.length) * 100 : 0;

  return (
    <div className="relative ml-2 flex flex-col">
      <div className="absolute bottom-8 left-4 top-5 z-0 w-0.5 bg-slate-100" />
      <div
        className="absolute left-4 top-5 z-0 w-0.5 bg-brand transition-all duration-500"
        style={{ height: `${Math.max(0, progress)}%` }}
      />
      {steps.map((step) => (
        <div
          key={step.id}
          className={cn(
            "relative z-10 flex items-start gap-5 py-3 transition-opacity",
            step.state === "idle" ? "opacity-50" : "opacity-100",
          )}
        >
          <div
            className={cn(
              "mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white transition-colors",
              step.state === "running" && "border-brand",
              step.state === "pass" && "border-status-emerald bg-status-emerald-bg",
              step.state === "fail" && "border-status-crimson bg-status-crimson-bg",
              step.state === "idle" && "border-slate-200",
            )}
          >
            {step.state === "running" ? <LoaderCircle className="h-3 w-3 animate-spin text-brand" /> : null}
            {step.state === "pass" ? <Check className="h-3 w-3 text-status-emerald" /> : null}
            {step.state === "fail" ? <span className="text-[10px] font-bold text-status-crimson">!</span> : null}
            {step.state === "idle" ? <span className="h-2 w-2 rounded-full bg-slate-300" /> : null}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-extrabold text-slate-900">{step.title}</h3>
            <p
              className={cn(
                "mt-0.5 font-mono text-[11px] font-semibold",
                step.state === "running" && "text-brand",
                step.state === "pass" && "text-status-emerald",
                step.state === "fail" && "text-status-crimson",
                step.state === "idle" && "text-slate-400",
              )}
            >
              {step.detail}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
