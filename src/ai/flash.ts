// src/ai/flash.ts
import { ai } from "@/ai/genkit";

function normalizeBase64(data?: string) {
  if (!data || typeof data !== "string") {
    return { mime: "", base64: "" };
  }

  if (data.startsWith("data:")) {
    const match = data.match(/^data:(.*?);base64,(.*)$/);
    if (match) return { mime: match[1], base64: match[2] };
    return { mime: "", base64: "" };
  }

  return { mime: "application/octet-stream", base64: data };
}

/* ---------------------------------------------------------
   Build Safe Data URL (ONLY for raw base64)
--------------------------------------------------------- */
function safeDataUrl(base64: string | undefined, mime: string) {
  if (!base64 || typeof base64 !== "string") return null;

  const norm = normalizeBase64(base64);
  if (!norm.base64) return null;

  const finalMime = norm.mime || mime;
  return `data:${finalMime};base64,${norm.base64}`;
}

/* ---------------------------------------------------------
   askFlash — WITH JSON MODE SUPPORT
--------------------------------------------------------- */
export async function askFlash(
  systemPrompt: string,
  question: string,
  history: {
    role: "user" | "assistant" | "model";
    content: string;
    imageBase64?: string;  // can be URL or base64
  }[] = [],
  imageBase64?: string, // user attachment (image)
  pdfObject?: { base64: string; mime: string; name?: string } | null,
  useWebSearch?: boolean,
  jsonMode?: boolean // JSON mode parameter
): Promise<string> {

  console.log("🔥 askFlash() STARTED — WITH JSON MODE SUPPORT", {
    useWebSearch,
    jsonMode
  });

  const messages: any[] = [];

  /* ---------------------------
     1) SYSTEM PROMPT
  ---------------------------- */
  // If JSON mode, add JSON schema to system prompt
  let finalSystemPrompt = systemPrompt;

  if (jsonMode) {
    finalSystemPrompt = `${systemPrompt}

===== JSON OUTPUT REQUIREMENT =====
You MUST respond with ONLY a valid JSON object. 
DO NOT include markdown code blocks (\`\`\`json).
DO NOT include any text before or after the JSON.
Your response must be parseable JSON starting with { and ending with }.

Required JSON structure:
{
  "answer": "string - your detailed answer",
  "citations": [
    {
      "book_name": "string - exact book name",
      "book_id": "string - exact book ID", 
      "page": number - exact page number
    }
  ]
}

If no citations, use: "citations": []
===================================`;

    console.log("🟢 JSON MODE ENABLED - Enhanced system prompt");
  }

  if (finalSystemPrompt?.trim()) {
    messages.push({
      role: "user",
      content: [{ text: finalSystemPrompt.trim() }],
    });
    messages.push({
      role: "model",
      content: [{ text: "Understood. I will follow these instructions." }],
    });
  }

  /* ---------------------------
     2) HISTORY
  ---------------------------- */
  for (const msg of history) {
    const parts: any[] = [];

    if (msg.content?.trim()) {
      parts.push({ text: msg.content.trim() });
    }

    if (msg.imageBase64) {
      const isUrl =
        msg.imageBase64.startsWith("http://") ||
        msg.imageBase64.startsWith("https://");

      if (isUrl) {
        parts.push({ media: { url: msg.imageBase64 } });
      } else {
        const url = safeDataUrl(msg.imageBase64, "image/jpeg");
        if (url) {
          parts.push({
            media: { url, contentType: "image/jpeg" },
          });
        }
      }
    }

    if (parts.length > 0) {
      const role = msg.role === "assistant" ? "model" : "user";
      messages.push({
        role,
        content: parts,
      });
    }
  }

  /* ---------------------------
     3) CURRENT USER MESSAGE
  ---------------------------- */
  const userParts: any[] = [];

  // If JSON mode, add final reminder
  let finalQuestion = question?.trim() || "";
  if (jsonMode) {
    finalQuestion += "\n\n[Output JSON only - no markdown, no extra text]";
  }

  if (finalQuestion) {
    userParts.push({ text: finalQuestion });
  }

  // Attached image
  if (imageBase64) {
    const isUrl =
      imageBase64.startsWith("http://") ||
      imageBase64.startsWith("https://");

    if (isUrl) {
      userParts.push({
        media: { url: imageBase64 },
      });
    } else {
      const url = safeDataUrl(imageBase64, "image/jpeg");
      if (url) {
        userParts.push({
          media: { url, contentType: "image/jpeg" },
        });
      }
    }
  }

  // Attached document (PDF / DOCX etc.)
  if (pdfObject?.base64) {
    const url = safeDataUrl(pdfObject.base64, pdfObject.mime);
    if (url) {
      userParts.push({
        media: { url, contentType: pdfObject.mime },
      });
    }
  }

  if (userParts.length > 0) {
    messages.push({
      role: "user",
      content: userParts,
    });
  }

  /* ---------------------------
     4) SEND TO GEMINI (WITH RETRY)
  ---------------------------- */
  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      // Genkit config structure
      const genkitConfig: any = {};

      // Add web search if needed
      if (useWebSearch) {
        genkitConfig.googleSearchRetrieval = {
          disableAttribution: false
        };
      }

      console.log(`🚀 Sending to Gemini via Genkit (Attempt ${attempt + 1}/${MAX_RETRIES})`, {
        useWebSearch,
        jsonMode,
        messageCount: messages.length
      });

      const resp = await (ai as any).generate({
        model: "googleai/gemini-1.5-flash",
        messages,
        config: Object.keys(genkitConfig).length > 0 ? genkitConfig : undefined
      });

      let text =
        resp?.candidates?.[0]?.content?.[0]?.parts?.[0]?.text ||
        resp?.text ||
        "No answer returned.";

      console.log("🤖 GEMINI RAW RESPONSE (first 300 chars):", text.slice(0, 300));

      // Clean up response if JSON mode
      if (jsonMode) {
        // Remove markdown code blocks if present
        text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");

        // Try to extract JSON if there's extra text
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          text = jsonMatch[0];
        }

        console.log("🟢 CLEANED JSON RESPONSE (first 300 chars):", text.slice(0, 300));

        // Validate it's actually JSON
        try {
          JSON.parse(text);
          console.log("✅ Valid JSON confirmed");
        } catch (e) {
          console.warn("⚠️ Response is not valid JSON, attempting fallback");
          // If it's not valid JSON, wrap it
          text = JSON.stringify({
            answer: text,
            citations: []
          });
        }
      }

      return text;

    } catch (err: any) {
      console.error(`❌ askFlash ERROR (Attempt ${attempt + 1}):`, err.message);

      // Check for 429 (Rate Limit)
      if (err.message?.includes("429") || err.message?.includes("Too Many Requests")) {
        attempt++;
        if (attempt < MAX_RETRIES) {
          // 🔥 استخرج وقت الانتظار من رسالة الخطأ
          const retryMatch = err.message.match(/retry in ([\d.]+)s/i);
          const suggestedWait = retryMatch ? parseFloat(retryMatch[1]) * 1000 : 0;

          // استخدم الأكبر: الوقت المقترح أو exponential backoff
          const exponentialWait = Math.pow(2, attempt) * 15000; // 30s, 60s, 120s
          const waitTime = Math.max(suggestedWait, exponentialWait);

          console.log(`⏳ Rate limit hit. Waiting ${Math.round(waitTime / 1000)}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }

      // If not 429 or max retries reached, return error
      return jsonMode
        ? '{"answer": "حدث خطأ أثناء معالجة الطلب (Rate Limit). يرجى المحاولة مجددًا بعد قليل.", "citations": []}'
        : "حدث خطأ أثناء معالجة الملف أو الصورة. يرجى المحاولة مجددًا.";
    }
  }

  return jsonMode
    ? '{"answer": "حدث خطأ غير متوقع. يرجى المحاولة مجددًا.", "citations": []}'
    : "حدث خطأ غير متوقع.";
}