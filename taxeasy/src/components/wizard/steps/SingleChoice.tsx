"use client";

import { WizardNode, AnswerValue } from "@/types/wizard";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Props {
  node: WizardNode;
  value: AnswerValue;
  onChange: (value: string) => void;
}

export function SingleChoice({ node, value, onChange }: Props) {
  return (
    <RadioGroup
      value={typeof value === "string" ? value : ""}
      onValueChange={onChange}
      className="space-y-3"
    >
      {node.options?.map((option) => (
        <label
          key={option.value}
          className={cn(
            "flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors",
            "hover:border-blue-300 hover:bg-blue-50",
            value === option.value
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 bg-white"
          )}
        >
          <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
          <div className="flex-1">
            <Label htmlFor={option.value} className="cursor-pointer font-medium text-gray-900">
              {option.label}
            </Label>
            {option.description && (
              <p className="text-sm text-gray-500 mt-0.5">{option.description}</p>
            )}
          </div>
        </label>
      ))}
    </RadioGroup>
  );
}
