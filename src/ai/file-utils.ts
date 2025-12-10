import mammoth from "mammoth";

/*
  input: { base64: string, mime: string }
  output: {
     type: "pdf" | "image" | "text",
     base64?, mime?, text?
  }
*/

export async function processUploadedFile(base64: string, mime: string) {
  // ============================
  // 1) PDF
  // ============================
  if (mime === "application/pdf") {
    return {
      type: "pdf",
      base64,
      mime,
    };
  }

  // ============================
  // 2) IMAGE (JPG / PNG / WEBP)
  // ============================
  if (mime.startsWith("image/")) {
    return {
      type: "image",
      base64,
      mime,
    };
  }

  // ============================
  // 3) DOCX → extract text using mammoth
  // ============================
  if (
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    try {
      const buffer = Buffer.from(base64, "base64");

      const result = await mammoth.extractRawText({ buffer });

      return {
        type: "text",
        text: result.value || "",
      };
    } catch (err) {
      console.error("❌ DOCX PARSE FAILED:", err);
      return { type: "text", text: "" };
    }
  }

  // ============================
  // 4) TXT
  // ============================
  if (mime === "text/plain") {
    const text = Buffer.from(base64, "base64").toString("utf8");
    return {
      type: "text",
      text,
    };
  }

  // ============================
  // 5) Unsupported → return raw text fallback
  // ============================
  return {
    type: "text",
    text: "",
  };
}
