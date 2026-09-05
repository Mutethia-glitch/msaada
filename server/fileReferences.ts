import { z } from "zod";

export const fileReferenceInput = z.object({ fileKey: z.string().min(1).max(500), fileUrl: z.string().url().max(1000), fileName: z.string().min(1).max(255), mimeType: z.string().min(1).max(120) });
export type FileReferenceInput = z.infer<typeof fileReferenceInput>;
export function toNeedFileReference(input: FileReferenceInput, needId: number, uploadedBy: number) { return { ...input, needId, uploadedBy }; }
