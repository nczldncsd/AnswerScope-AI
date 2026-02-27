"use client";

import { useMutation } from "@tanstack/react-query";

import { apiRequest } from "@/lib/api/client";
import { apiEndpoints } from "@/lib/api/endpoints";

function downloadBlob(blob: Blob, fileName: string) {
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(blobUrl);
}

export function usePdfDownloadMutation() {
  return useMutation({
    mutationFn: async (scanId: number) => {
      const blob = await apiRequest<Blob>(apiEndpoints.pdfReport(scanId), {
        responseType: "blob",
      });
      downloadBlob(blob, `answerscope_report_scan_${scanId}.pdf`);
      return true;
    },
  });
}
