
import { GoogleGenerativeAI } from "@google/generative-ai";
import { VisionProvider } from "./vision-interface";

const API_KEY = process.env.GEMINI_API_KEY || "";

if (!API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY is missing. Vision features will fail.");
}

const genAI = new GoogleGenerativeAI(API_KEY);

// Use Flash for speed and cost efficiency as requested
const MODEL_NAME = "gemini-1.5-flash";

export class GeminiVisionProvider implements VisionProvider {
    async extractText(
        base64Data: string,
        mimeType: string,
        prompt: string = "Extract all text from this image/document accurately. If there are diagrams, describe them in detail."
    ): Promise<string> {
        try {
            const model = genAI.getGenerativeModel({ model: MODEL_NAME });

            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: mimeType,
                    },
                },
            ]);

            const text = result.response.text();
            return text || "";
        } catch (error: any) {
            console.error("❌ Gemini Vision Error:", error);
            throw new Error(`Vision processing failed: ${error.message}`);
        }
    }
}

export const geminiVision = new GeminiVisionProvider();
