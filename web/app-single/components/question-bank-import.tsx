"use client";

import { useState } from "react";
import { Download, Upload, FileSpreadsheet } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/components/toast";
import { ModalForm } from "@/components/modal-form";
import { downloadBlob } from "@/lib/download";

interface ImportResult {
  total: number;
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export function QuestionBankImport({ queryKey }: { queryKey: string[] }) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const downloadTemplate = async (fmt: string) => {
    const ok = await downloadBlob(`/question-bank/template/?fmt=${fmt}`, `question_bank_template.${fmt}`);
    if (!ok) showToast("error", "Failed to download template.");
  };

  const startImport = () => {
    setFile(null);
    setResult(null);
    setOpen(true);
  };

  const submit = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.upload<ImportResult>("/question-bank/import/", fd);
      setResult(res);
      if (res.created > 0) {
        showToast("success", `${res.created} question${res.created === 1 ? "" : "s"} imported.`);
        queryClient.invalidateQueries({ queryKey });
      } else {
        showToast("error", "No questions were imported. Check the errors below.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Import failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => downloadTemplate("xlsx")}
        title="Download XLSX template"
        className="px-3 py-2 text-sm border border-navy-700 text-gray-300 rounded-lg hover:border-gold-500 hover:text-gold-400 inline-flex items-center gap-2"
      >
        <FileSpreadsheet className="w-4 h-4" />
        Template
      </button>
      <button
        onClick={() => downloadTemplate("csv")}
        title="Download CSV template"
        className="px-3 py-2 text-sm border border-navy-700 text-gray-300 rounded-lg hover:border-gold-500 hover:text-gold-400 inline-flex items-center gap-2"
      >
        <Download className="w-4 h-4" />
        CSV
      </button>
      <button
        onClick={startImport}
        className="px-4 py-2 text-sm bg-navy-700 text-gold-500 font-semibold rounded-lg hover:bg-navy-600 inline-flex items-center gap-2"
      >
        <Upload className="w-4 h-4" />
        Import
      </button>

      <ModalForm
        open={open}
        onClose={() => setOpen(false)}
        title="Import Questions"
        footer={
          <>
            <button
              onClick={() => setOpen(false)}
              disabled={uploading}
              className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={uploading || !file}
              className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50"
            >
              {uploading ? "Importing..." : "Import"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Upload a CSV or XLSX file with questions. Use the template buttons in the toolbar to download a sample with the
            required columns (question_text, question_type, difficulty, program, subject_code, module, options,
            correct_answer, explanation, reference).
          </p>

          <label className="block">
            <span className="text-sm text-gray-400 mb-1 block">File</span>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-navy-700 bg-navy-900 text-sm text-gray-200 hover:border-gold-500 cursor-pointer">
                <Upload className="w-4 h-4" />
                {file ? file.name : "Choose file"}
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null);
                    setResult(null);
                  }}
                />
              </label>
            </div>
          </label>

          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-navy-900 border border-navy-700 rounded-lg p-3 text-center">
                  <p className="text-xl font-semibold text-white">{result.total}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
                <div className="bg-navy-900 border border-green-500/30 rounded-lg p-3 text-center">
                  <p className="text-xl font-semibold text-green-400">{result.created}</p>
                  <p className="text-xs text-gray-500">Created</p>
                </div>
                <div className="bg-navy-900 border border-navy-700 rounded-lg p-3 text-center">
                  <p className="text-xl font-semibold text-red-400">{result.skipped}</p>
                  <p className="text-xs text-gray-500">Skipped</p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <p className="text-xs font-semibold text-red-400 mb-1">Errors</p>
                  <ul className="space-y-1">
                    {result.errors.map((e, i) => (
                      <li key={i} className="text-xs text-red-300">
                        Row {e.row}: {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </ModalForm>
    </>
  );
}
