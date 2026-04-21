"use client";

import { useState, useEffect } from "react";
import { WizardNode, AnswerValue } from "@/types/wizard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCHF, chfInputToCentimes, centimesToCHF } from "@/lib/utils/currency";

interface Props {
  node: WizardNode;
  value: AnswerValue;
  onChange: (value: number) => void;
}

export function NumberCHF({ node, value, onChange }: Props) {
  const centimes = typeof value === "number" ? value : 0;
  const [display, setDisplay] = useState(centimes > 0 ? String(centimesToCHF(centimes)) : "");

  useEffect(() => {
    const c = typeof value === "number" ? value : 0;
    if (c === 0) setDisplay("");
    else setDisplay(String(centimesToCHF(c)));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9.,]/g, "");
    setDisplay(raw);
    const parsed = parseFloat(raw.replace(",", "."));
    if (!isNaN(parsed)) {
      onChange(chfInputToCentimes(parsed));
    } else if (raw === "" || raw === "0") {
      onChange(0);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={node.id} className="sr-only">
        {node.question}
      </Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium select-none">
          CHF
        </span>
        <Input
          id={node.id}
          type="text"
          inputMode="decimal"
          value={display}
          onChange={handleChange}
          placeholder="0.00"
          className="pl-14 text-right text-lg font-mono"
          min={node.min}
          max={node.max}
        />
      </div>
      {centimes > 0 && (
        <p className="text-sm text-gray-500 text-right">
          = {formatCHF(centimes)}
        </p>
      )}
    </div>
  );
}
