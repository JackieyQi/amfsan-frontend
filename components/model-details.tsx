import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function ModelDetails({ name, children }: { name: string; children: ReactNode }) {
  return (
    <details className="group/model">
      <summary aria-label={`${name}的模型详情`} className="flex cursor-pointer list-none items-center gap-2 rounded-md py-2 text-sm font-medium text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600 [&::-webkit-details-marker]:hidden">
        <ChevronDown aria-hidden="true" className="size-4 -rotate-90 transition-transform group-open/model:rotate-0" />
        <span className="group-open/model:hidden">展开详情</span>
        <span className="hidden group-open/model:inline">收起详情</span>
      </summary>
      <div className="mt-3 space-y-4 border-t pt-4">{children}</div>
    </details>
  );
}
