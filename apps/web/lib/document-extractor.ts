export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  if (mimeType === "application/pdf" || filename.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")) as unknown as (buffer: Buffer) => Promise<{ text: string }>;
    const result = await pdfParse(buffer);
    return result.text;
  }
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    filename.endsWith(".docx")
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  if (mimeType === "text/plain" || filename.endsWith(".txt")) {
    return buffer.toString("utf-8");
  }
  throw new Error(`Unsupported file type: ${mimeType}`);
}
