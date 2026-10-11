import { uniqueId, type Attachment } from "./demo";

export const MEDIA_MAX_BYTES = 10 * 1024 * 1024;
export const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "video/quicktime"] as const;

export function validateMediaFile(file: File): string | null {
  if (!ALLOWED_MEDIA_TYPES.includes(file.type as (typeof ALLOWED_MEDIA_TYPES)[number])) return "Format non autorisé. Utilisez JPG, PNG, WEBP, MP4, WEBM ou MOV.";
  if (file.size > MEDIA_MAX_BYTES) return "Fichier trop volumineux : la limite locale est de 10 Mo.";
  if (file.size === 0) return "Le fichier est vide.";
  return null;
}

export function attachmentFromFile(file: File): Attachment {
  return { id: uniqueId("ATT"), name: file.name, mimeType: file.type, size: file.size, previewUrl: URL.createObjectURL(file), status: "local" };
}

export function revokeAttachmentPreview(attachment: Attachment) {
  if (attachment.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(attachment.previewUrl);
}

export function isVideoAttachment(attachment: Attachment) { return attachment.mimeType.startsWith("video/"); }
