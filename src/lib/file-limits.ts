// One size rule for every file the web apps upload (admin, seller, buyer and
// public). Images can be up to 2 MB, videos up to 10 MB, and any other file
// (a PDF, for example) up to 30 MB. Every file picker checks a file with
// `fileSizeProblem` the moment it is chosen, and the submit-time checks use the
// same function, so the limit is written here and nowhere else. The server
// checks too and stays the authority.

const MB = 1024 * 1024;

export type FileKind = "image" | "video" | "other";

export const FILE_LIMIT_MB: Record<FileKind, number> = { image: 2, video: 10, other: 30 };

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "avif", "heic", "heif", "tif", "tiff", "ico"];
const VIDEO_EXTENSIONS = ["mp4", "mov", "m4v", "webm", "mkv", "avi", "wmv", "flv", "3gp", "mpeg", "mpg"];

/** A picture, a video, or anything else. The browser's own type decides; the
 * file name is used only when the browser gives no type. */
export function fileKind(file: { name: string; type: string }): FileKind {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (!file.type) {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (IMAGE_EXTENSIONS.includes(extension)) return "image";
    if (VIDEO_EXTENSIONS.includes(extension)) return "video";
  }
  return "other";
}

export const maxBytesFor = (file: { name: string; type: string }): number => FILE_LIMIT_MB[fileKind(file)] * MB;

export function formatSize(bytes: number): string {
  return bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const KIND_LABEL: Record<FileKind, string> = { image: "Images", video: "Videos", other: "Files" };

/** The message to show, or null when the file is within its limit. */
export function fileSizeProblem(file: File): string | null {
  const kind = fileKind(file);
  if (file.size <= FILE_LIMIT_MB[kind] * MB) return null;
  return `${file.name} is ${formatSize(file.size)}. ${KIND_LABEL[kind]} can be up to ${FILE_LIMIT_MB[kind]} MB.`;
}

/** Splits picked files into those within their limit and one message per file
 * that is over it. */
export function splitBySize(files: File[]): { accepted: File[]; problems: string[] } {
  const accepted: File[] = [];
  const problems: string[] = [];
  for (const file of files) {
    const problem = fileSizeProblem(file);
    if (problem) problems.push(problem);
    else accepted.push(file);
  }
  return { accepted, problems };
}

/** The same rule as a short line for a picker's hint. */
export const SIZE_HINT_IMAGE = `Maximum size ${FILE_LIMIT_MB.image} MB.`;
export const SIZE_HINT_ANY = `Images up to ${FILE_LIMIT_MB.image} MB, videos up to ${FILE_LIMIT_MB.video} MB, other files up to ${FILE_LIMIT_MB.other} MB.`;

/** For the onChange of a single-file input. Returns the chosen file, `null`
 * when the choice was cleared, or `undefined` when the file is over its limit
 * (the input is emptied and `onProblem` gets the message, so the caller keeps
 * whatever it had). A good choice clears the message. */
export function takeFile(input: HTMLInputElement, onProblem: (message: string | null) => void): File | null | undefined {
  const file = input.files?.[0] ?? null;
  const problem = file ? fileSizeProblem(file) : null;
  onProblem(problem);
  if (problem) {
    input.value = "";
    return undefined;
  }
  return file;
}

/** The same for a multi-file input: the files within their limits, and one
 * message per file that is over it (joined, or null when all are fine). */
export function takeFiles(input: HTMLInputElement, onProblem: (message: string | null) => void): File[] {
  const { accepted, problems } = splitBySize(Array.from(input.files ?? []));
  onProblem(problems.length ? problems.join(" ") : null);
  return accepted;
}
