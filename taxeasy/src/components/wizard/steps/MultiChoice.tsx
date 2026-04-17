"use client";

import { WizardNode, AnswerValue } from "@/types/wizard";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Props {
  node: WizardNode;
  value: AnswerValue;
  onChange: (value: string[]) => void;
}

export function MultiChoice({ node, value, onChange }: Props) {
  const selected: string[] = Array.isArray(value) ? value : [];

  function toggle(optionValue: string) {
    const isNone = optionValue === "none";
    if (isNone) {
      onChange(selected.includes("none") ? [] : ["none"]);
      return;
    }

    const next = selected.includes(optionValue)
      ? selected.filter((v) => v !== optionValue)
      : [...selected.filter((v) => v !== "none"), optionValue];

    onChange(next);
  }

  return (
    <div className="space-y-3">
      {node.options?.map((option) => {
        const checked = selected.includes(option.value);
        return (
          <label
            key={option.value}
            className={cn(
              "flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors",
              "hover:border-blue-300 hover:bg-blue-50",
              checked ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
            )}
          >
            <Checkbox
              id={option.value}
              checked={checked}
              onCheckedChange={() => toggle(option.value)}
              className="mt-1"
            />
            <div className="flex-1">
              <Label htmlFor={option.value} className="cursor-pointer font-medium text-gray-900">
                {option.label}
              </Label>
              {option.description && (
                <p className="text-sm text-gray-500 mt-0.5">{option.description}</p>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}
