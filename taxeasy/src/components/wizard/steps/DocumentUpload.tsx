"use client";

import { useState, useRef } from "react";
import { WizardNode } from "@/types/wizard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { DOC_TYPE_LABELS } from "@/types/document";

interface Props {
  node: WizardNode;
  declarationId: string;
  /** Appelé après upload réussi. extractedAnswers = valeurs pré-remplies par OCR. */
  onUploaded: (extractedAnswers?: Record<string, number>) => void;
}

interface UploadedFile {
  name: string;
  status: "uploading" | "done" | "error";
  documentId?: string;
  ocrStatus?: "done" | "manual_review";
  extractedAnswers?: Record<string, number>;
}

export function DocumentUpload({ node, declarationId, onUploaded }: Props) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const docType = node.requiredDocuments?.[0] ?? "OTHER";
  const label = DOC_TYPE_LABELS[docType as keyof typeof DOC_TYPE_LABELS] ?? "Document";

  async function uploadFile(file: File) {
    const entry: UploadedFile = { name: file.name, status: "uploading" };
    setFiles((prev) => [...prev, entry]);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", docType);
    formData.append("declarationId", declarationId);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur" }));
        throw new Error(err.error ?? "Upload échoué");
      }

      const { document, extractedAnswers, ocrStatus } = await res.json();
      setFiles((prev) =>
        prev.map((f) =>
          f.name === file.name
            ? { ...f, status: "done", documentId: document.id, ocrStatus, extractedAnswers }
            : f
        )
      );
      onUploaded(extractedAnswers ?? undefined);
    } catch {
      setFiles((prev) =>
        prev.map((f) =>
          f.name === file.name ? { ...f, status: "error" } : f
        )
      );
    }
  }

  function handleFiles(fileList: FileList) {
    Array.from(fileList).forEach(uploadFile);
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
          ${dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-700">
              Déposez votre <span className="text-blue-600">{label}</span> ici
            </p>
            <p className="text-sm text-gray-500 mt-1">
              ou cliquez pour sélectionner — PDF, JPEG, PNG (max 20 MB)
            </p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          multiple
          className="sr-only"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f, i) => (
            <li key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700 truncate max-w-xs">{f.name}</span>
              {f.status === "uploading" && (
                <Badge variant="secondary">Envoi…</Badge>
              )}
              {f.status === "done" && f.ocrStatus === "done" && (
                <Badge className="bg-green-100 text-green-700">✓ Lu automatiquement</Badge>
              )}
              {f.status === "done" && f.ocrStatus === "manual_review" && (
                <Badge className="bg-amber-100 text-amber-700">✓ Envoyé — vérification manuelle</Badge>
              )}
              {f.status === "done" && !f.ocrStatus && (
                <Badge className="bg-green-100 text-green-700">✓ Envoyé</Badge>
              )}
              {f.status === "error" && (
                <Badge variant="destructive">Erreur</Badge>
              )}
            </li>
          ))}
        </ul>
      )}

      <Alert>
        <AlertDescription className="text-sm text-gray-600">
          Ce document ne sera jamais partagé publiquement. Il est stocké de manière sécurisée
          et utilisé uniquement pour préremplir votre déclaration via OCR.
        </AlertDescription>
      </Alert>
    </div>
  );
}
