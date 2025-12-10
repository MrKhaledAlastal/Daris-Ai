import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function ocrImage(imageBuffer: Buffer): Promise<string> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent([
        {
            inlineData: {
                mimeType: "image/png",
                data: imageBuffer.toString("base64"),
            },
        },
        "Extract all Arabic text from the image clearly and fix OCR errors."
    ]);

    return result.response.text();
}
