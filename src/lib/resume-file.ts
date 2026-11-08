import type { ResumeSource } from "./types";

// Rules for a resume the seeker uploads with an application. The Application
// Service checks the same limits (and the file's magic bytes); these checks
// only give the seeker a clear message before anything is sent.

export const RESUME_FILE_MAX_BYTES = 5 * 1024 * 1024;
export const PDF_CONTENT_TYPE = "application/pdf";
export const DOCX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = { pdf: PDF_CONTENT_TYPE, docx: DOCX_CONTENT_TYPE };

/** The content type for a file name's extension, or null when it is not a PDF or DOCX. */
export function resumeContentType(fileName: string): string | null {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0) return null;
  return CONTENT_TYPE_BY_EXTENSION[fileName.slice(dot + 1).toLowerCase()] ?? null;
}

/** A message for the seeker when the file can't be sent, or null when it is fine. */
export function validateResumeFile(file: { name: string; size: number }): string | null {
  if (!resumeContentType(file.name)) return "Choose a PDF or DOCX file.";
  if (file.size === 0) return "This file is empty.";
  if (file.size > RESUME_FILE_MAX_BYTES) return "This file is larger than 5 MB.";
  return null;
}

/** "850 B", "12.4 KB", "2.0 MB". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const RESUME_SOURCE_LABEL: Record<ResumeSource, string> = {
  tailored: "Tailored with RoleFit",
  uploaded: "Uploaded by candidate",
};

/** Standard base64 of the file's bytes (no data-URL prefix). */
export async function fileToBase64(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

/** Turns a server message for a `resumeFile.*` field ("must be at most 5 MB") into a full sentence. */
export function resumeFileErrorMessage(message: string): string {
  if (/does not match/i.test(message)) return "This file isn't a real PDF or DOCX. Please export it again and retry.";
  const text = /^[a-z]/.test(message) ? `Resume file ${message}` : message;
  return /[.!?]$/.test(text) ? text : `${text}.`;
}
