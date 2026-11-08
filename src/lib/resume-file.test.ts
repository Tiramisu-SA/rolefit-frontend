import { describe, expect, it } from "vitest";
import {
  DOCX_CONTENT_TYPE,
  RESUME_FILE_MAX_BYTES,
  RESUME_SOURCE_LABEL,
  fileToBase64,
  formatFileSize,
  resumeContentType,
  validateResumeFile,
} from "./resume-file";

describe("resumeContentType", () => {
  it("maps .pdf and .docx, ignoring case", () => {
    expect(resumeContentType("a.pdf")).toBe("application/pdf");
    expect(resumeContentType("My Resume.DOCX")).toBe(DOCX_CONTENT_TYPE);
  });
  it("rejects other or missing extensions", () => {
    expect(resumeContentType("a.doc")).toBeNull();
    expect(resumeContentType("a.pdf.exe")).toBeNull();
    expect(resumeContentType("pdf")).toBeNull();
  });
});

describe("validateResumeFile", () => {
  it("accepts a PDF or DOCX up to 5 MB", () => {
    expect(validateResumeFile({ name: "a.pdf", size: 1 })).toBeNull();
    expect(validateResumeFile({ name: "a.docx", size: RESUME_FILE_MAX_BYTES })).toBeNull();
  });
  it("explains why a file is rejected", () => {
    expect(validateResumeFile({ name: "a.png", size: 10 })).toBe("Choose a PDF or DOCX file.");
    expect(validateResumeFile({ name: "a.pdf", size: 0 })).toBe("This file is empty.");
    expect(validateResumeFile({ name: "a.pdf", size: RESUME_FILE_MAX_BYTES + 1 })).toBe("This file is larger than 5 MB.");
  });
});

describe("formatFileSize", () => {
  it("uses B, KB and MB", () => {
    expect(formatFileSize(850)).toBe("850 B");
    expect(formatFileSize(12_698)).toBe("12.4 KB");
    expect(formatFileSize(2 * 1024 * 1024)).toBe("2.0 MB");
  });
});

describe("fileToBase64", () => {
  it("encodes bytes without a data-URL prefix, including large files", async () => {
    expect(await fileToBase64(new Blob([new Uint8Array([0xff, 0x00, 0x10])]))).toBe("/wAQ");
    const big = new Uint8Array(100_000).fill(65);
    expect(await fileToBase64(new Blob([big]))).toBe(Buffer.from(big).toString("base64"));
  });
});

describe("RESUME_SOURCE_LABEL", () => {
  it("labels both sources", () => {
    expect(RESUME_SOURCE_LABEL.uploaded).toBe("Uploaded by candidate");
    expect(RESUME_SOURCE_LABEL.tailored).toBe("Tailored with RoleFit");
  });
});
