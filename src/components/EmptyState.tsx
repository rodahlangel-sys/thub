import type { ReactNode } from "react";
import { Card } from "@/components/Card";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card className="p-8 text-center">
      <h3 className="text-base font-semibold text-[#182f38]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#60727a]">
        {description}
      </p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </Card>
  );
}
