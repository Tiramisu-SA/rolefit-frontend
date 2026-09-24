import type { CandidateProfile, ExtractedProfile } from "@/lib/types";
import { extractedResumeSample } from "@/lib/mock/candidates";
import { CURRENT_CANDIDATE_ID, MockApiError, simulate, store } from "./_store";

function find(id: string) {
  const p = store.candidates.find((c) => c.id === id);
  if (!p) throw new MockApiError("Profile not found");
  return p;
}

export function getProfile(candidateId: string = CURRENT_CANDIDATE_ID): Promise<CandidateProfile> {
  return simulate(() => find(candidateId));
}

/** Mock of AI Model Adapter parseResume(): returns sample extracted data for any file. */
export function importResume(file: File): Promise<ExtractedProfile> {
  return simulate(() => ({ ...extractedResumeSample, fileName: file.name }), 1200);
}

export function confirmExtractedProfile(extracted: ExtractedProfile["profile"]): Promise<CandidateProfile> {
  return simulate(() => {
    const p = find(CURRENT_CANDIDATE_ID);
    Object.assign(p, extracted, { verified: true });
    return p;
  });
}

export function updateProfile(patch: Partial<Omit<CandidateProfile, "id">>): Promise<CandidateProfile> {
  return simulate(() => {
    const p = find(CURRENT_CANDIDATE_ID);
    Object.assign(p, patch);
    return p;
  });
}
