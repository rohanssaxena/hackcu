import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const BUCKET = "workspace-files";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const TEXT_TYPES = new Set(["md", "txt", "doc", "docx"]);
const PDF_TYPES = new Set(["pdf"]);

async function extractPdfText(buffer) {
  try {
    const doc = await getDocument({ data: new Uint8Array(buffer) }).promise;
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => item.str).join(" "));
    }
    doc.destroy();
    return pages.join("\n\n");
  } catch (e) {
    console.error("PDF extraction failed:", e.message);
    return "";
  }
}

async function extractOne(supabase, file) {
  if (file.file_size_bytes > MAX_FILE_SIZE) return null;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(file.storage_path);

  if (error || !data) {
    console.error(`Download failed for ${file.filename}:`, error?.message);
    return null;
  }

  const buffer = Buffer.from(await data.arrayBuffer());

  if (PDF_TYPES.has(file.file_type)) {
    const text = await extractPdfText(buffer);
    return text ? { filename: file.filename, text } : null;
  }

  if (TEXT_TYPES.has(file.file_type)) {
    return { filename: file.filename, text: buffer.toString("utf-8") };
  }

  return null;
}

export async function extractFolderText(supabase, files) {
  const results = await Promise.all(files.map((f) => extractOne(supabase, f)));
  return results.filter((r) => r !== null && r.text.length > 0);
}
