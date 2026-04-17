"use client";

import { WizardNode, AnswerValue } from "@/types/wizard";
import { SingleChoice } from "./steps/SingleChoice";
import { MultiChoice } from "./steps/MultiChoice";
import { NumberCHF } from "./steps/NumberCHF";
import { DocumentUpload } from "./steps/DocumentUpload";
import { SummaryStep } from "./steps/SummaryStep";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";

interface Props {
  node: WizardNode;
  value: AnswerValue;
  declarationId: string;
  onChange: (value: AnswerValue) => void;
  onDocumentUploaded?: (extractedAnswers?: Record<string, number>) => void;
}

export function StepRenderer({
  node,
  value,
  declarationId,
  onChange,
  onDocumentUploaded,
}: Props) {
  switch (node.type) {
    case "single_choice":
      return (
        <SingleChoice
          node={node}
          value={value}
          onChange={(v) => onChange(v)}
        />
      );

    case "multi_choice":
      return (
        <MultiChoice
          node={node}
          value={value}
          onChange={(v) => onChange(v)}
        />
      );

    case "number_chf":
      return (
        <NumberCHF
          node={node}
          value={value}
          onChange={(v) => onChange(v)}
        />
      );

    case "number":
      return (
        <div className="space-y-2">
          <Input
            type="number"
            value={typeof value === "number" ? value : ""}
            onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
            min={node.min}
            max={node.max}
            className="text-lg"
            placeholder={node.min !== undefined ? String(node.min) : "0"}
          />
        </div>
      );

    case "document_upload":
      return (
        <DocumentUpload
          node={node}
          declarationId={declarationId}
          onUploaded={onDocumentUploaded ?? (() => {})}
        />
      );

    case "info":
      return (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="whitespace-pre-line text-gray-700">
            {node.hint}
          </AlertDescription>
        </Alert>
      );

    case "summary":
      return <SummaryStep declarationId={declarationId} />;

    default:
      return (
        <p className="text-gray-500 italic">
          Type de question non supporté : {node.type}
        </p>
      );
  }
}
