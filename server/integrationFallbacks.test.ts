import { describe, expect, it } from "vitest";
import { toNeedFileReference, fileReferenceInput } from "./fileReferences";
import { narratePublicSummary } from "./voice";

describe("optional integration fallbacks", () => {
  it("returns a graceful narration fallback without credentials", async () => {
    const result = await narratePublicSummary("A concise request summary.", "need-1");
    expect(result).toEqual({ audioUrl: null, cached: false, fallback: true });
  });
  it("stores file metadata and references, not file contents", () => {
    const input = fileReferenceInput.parse({ fileKey: "needs/1/brief.pdf", fileUrl: "https://storage.example/brief.pdf", fileName: "brief.pdf", mimeType: "application/pdf" });
    expect(toNeedFileReference(input, 1, 2)).toEqual({ ...input, needId: 1, uploadedBy: 2 });
  });
});
