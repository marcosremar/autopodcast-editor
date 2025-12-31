"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Download, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ExportButtonProps {
  projectId: string;
  selectedSegmentsCount: number;
  disabled?: boolean;
  className?: string;
}

type ExportStatus = "idle" | "processing" | "ready" | "error";

export function ExportButton({
  projectId,
  selectedSegmentsCount,
  disabled = false,
  className,
}: ExportButtonProps) {
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  const isDisabled = disabled || selectedSegmentsCount === 0;

  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  const startExport = async () => {
    setStatus("processing");
    setProgress(0);
    setDownloadUrl(null);
    setErrorMessage(null);

    try {
      // Start the export process
      const response = await fetch(`/api/export/${projectId}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to start export");
      }

      const data = await response.json();

      // Poll for export status
      const interval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/export/${projectId}`);
          if (!statusResponse.ok) {
            throw new Error("Failed to check export status");
          }

          const statusData = await statusResponse.json();

          if (statusData.status === "completed") {
            setStatus("ready");
            setProgress(100);
            setDownloadUrl(statusData.downloadUrl);
            clearInterval(interval);
            setPollInterval(null);
            toast.success("Exportação concluída!", {
              description: "Seu podcast está pronto para download.",
            });
          } else if (statusData.status === "failed") {
            setStatus("error");
            setErrorMessage(statusData.error || "Export failed");
            clearInterval(interval);
            setPollInterval(null);
            toast.error("Erro na exportação", {
              description: statusData.error || "Falha ao exportar o podcast.",
            });
          } else if (statusData.progress) {
            setProgress(statusData.progress);
          }
        } catch (error) {
          console.error("Error polling export status:", error);
          setStatus("error");
          setErrorMessage("Failed to check export status");
          clearInterval(interval);
          setPollInterval(null);
        }
      }, 2000); // Poll every 2 seconds

      setPollInterval(interval);
    } catch (error) {
      console.error("Error starting export:", error);
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to start export"
      );
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, "_blank");
    }
  };

  const reset = () => {
    setStatus("idle");
    setProgress(0);
    setDownloadUrl(null);
    setErrorMessage(null);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <AnimatePresence mode="wait">
        {status === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Button
              size="lg"
              onClick={startExport}
              disabled={isDisabled}
              className="w-full"
            >
              <Download className="mr-2 h-5 w-5" />
              Export Podcast
              {selectedSegmentsCount > 0 && (
                <span className="ml-2 text-xs opacity-80">
                  ({selectedSegmentsCount} segment
                  {selectedSegmentsCount !== 1 ? "s" : ""})
                </span>
              )}
            </Button>
            {isDisabled && selectedSegmentsCount === 0 && (
              <p className="mt-2 text-xs text-center text-gray-500">
                Select at least one segment to export
              </p>
            )}
          </motion.div>
        )}

        {status === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-3"
          >
            <Button size="lg" disabled className="w-full">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </Button>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Exporting podcast</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <motion.div
                  className="absolute left-0 top-0 h-full bg-blue-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            <p className="text-xs text-center text-gray-500">
              This may take a few minutes. You can close this page and come back
              later.
            </p>
          </motion.div>
        )}

        {status === "ready" && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-3"
          >
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <h4 className="font-semibold text-green-900">
                    Export Complete!
                  </h4>
                  <p className="text-sm text-green-700">
                    Your podcast is ready to download
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="lg"
                  onClick={handleDownload}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Download
                </Button>
                <Button size="lg" variant="outline" onClick={reset}>
                  Export Again
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-3"
          >
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-3 mb-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <div>
                  <h4 className="font-semibold text-red-900">Export Failed</h4>
                  <p className="text-sm text-red-700">
                    {errorMessage || "An error occurred during export"}
                  </p>
                </div>
              </div>

              <Button
                size="lg"
                variant="outline"
                onClick={reset}
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
