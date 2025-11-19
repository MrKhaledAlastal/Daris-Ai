'use server';

/**
 * Smart Tawjihi AI — bilingual study assistant by Vextronic
 * • Detects user language automatically and replies in the same language
 * • Works with Gemini 1.5 Flash
 * • Supports textbook content, images, and optional web search
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// ---------- SCHEMAS ----------
const HistoryMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const AnswerStudyQuestionInputSchema = z.object({
  question: z.string().describe('Student question.'),
  textbookContent: z.string().describe('Extracted textbook text.'),
  availableBooks: z.array(z.object({ id: z.string(), fileName: z.string() })).optional().describe('List of available books for the user.'),
  expandSearchOnline: z.boolean().describe('Whether to expand search online.'),
  language: z.enum(['en', 'ar']).optional().describe('Optional manual language override.'),
  imageDataUri: z.string().optional().describe('Optional Base64 image.'),
  history: z.array(HistoryMessageSchema).optional().describe('Conversation history.'),
});

export type AnswerStudyQuestionInput = z.infer<typeof AnswerStudyQuestionInputSchema>;

const AnswerStudyQuestionOutputSchema = z.object({
  answer: z.string(),
  source: z.string().describe("The source of the information, either 'textbook' or 'web'."),
  sourceBookName: z.string().optional().describe("If the source is 'textbook', this is the name of the book used."),
});
export type AnswerStudyQuestionOutput = z.infer<typeof AnswerStudyQuestionOutputSchema>;


// ---------- MAIN FUNCTION ----------
export async function answerStudyQuestion(input: AnswerStudyQuestionInput): Promise<AnswerStudyQuestionOutput> {
  return answerStudyQuestionFlow(input);
}

const answerStudyQuestionFlow = ai.defineFlow(
  {
    name: 'answerStudyQuestionFlow',
    inputSchema: AnswerStudyQuestionInputSchema,
    outputSchema: AnswerStudyQuestionOutputSchema,
  },

  async (input) => {
    let answerSource = 'textbook';
    if (input.expandSearchOnline) {
      answerSource = 'web';
    }

    const bookList = input.availableBooks && input.availableBooks.length > 0
        ? `The user has the following books available: ${input.availableBooks.map(b => b.fileName).join(', ')}.`
        : "The user has no books uploaded.";

    // ---------- SMART PROMPT ----------
    const systemPromptEN = `
You are **Smart Tawjihi AI**, a bilingual educational assistant by **Vextronic**.
Your mission is to help high-school (Tawjihi) students understand concepts clearly, not just memorize answers.
You will use the supplemental content (textbook excerpts or optional web information) to respond accurately and educationally.
${bookList}

When you use information from a textbook, you MUST identify which book it came from and set its name in the 'sourceBookName' output field.
If the information is general knowledge or from the web, leave 'sourceBookName' empty.

- If the student’s question is in English, reply in clear, friendly English.
- Use formatting (paragraphs, lists, emojis like 📘, 🧠, ✅, ⚡) to make the answer easy to read.

Supplemental content:
${input.textbookContent}
`;

    const systemPromptAR = `
أنت **توجيهي برو AI**، مساعد تعليمي ثنائي اللغة من **Vextronic**.
مهمتك هي مساعدة طلاب التوجيهي على فهم المفاهيم بوضوح، وليس فقط حفظ الإجابات.
ستستخدم المحتوى الإضافي (من الكتب المدرسية أو معلومات الويب الاختيارية) للرد بدقة وبشكل تعليمي.
${bookList}

عندما تستخدم معلومات من أحد الكتب، يجب عليك تحديد اسم الكتاب الذي أتت منه المعلومة ووضعه في حقل 'sourceBookName' في المخرجات.
إذا كانت المعلومة من معرفتك العامة أو من الويب، اترك حقل 'sourceBookName' فارغًا.

- إذا كان سؤال الطالب باللغة العربية، قم بالرد بلغة عربية فصحى وواضحة.
- استخدم التنسيق (فقرات، قوائم، رموز تعبيرية مثل 📘، 🧠، ✅، ⚡) لجعل الإجابة سهلة القراءة.

المحتوى الإضافي:
${input.textbookContent}
`;
    
    // ---------- LANGUAGE DETECTION ----------
    const detectLanguage = (text: string): 'ar' | 'en' => {
      if (/[\u0600-\u06FF]/.test(text)) return 'ar';
      if (/[a-zA-Z]/.test(text)) return 'en';
      return 'en';
    };
    const lang = input.language || detectLanguage(input.question);
    const systemPrompt = lang === 'ar' ? systemPromptAR : systemPromptEN;

    try {
      // ---------- HISTORY ----------
      const historyMessages = (input.history ?? []).map((msg) => ({
        role: msg.role,
        content: [{ text: msg.content }],
      }));

      // ---------- USER MESSAGE ----------
      const userMessageContent: ({ text: string } | { media: { url: string } })[] = [
        { text: input.question },
      ];
      if (input.imageDataUri) userMessageContent.push({ media: { url: input.imageDataUri } });

      const messages = [...historyMessages, { role: 'user' as const, content: userMessageContent }];

 // ---------- GEMINI CALL WITH FALLBACK -------------
// ---------- GEMINI CALL WITH FALLBACK (CLEAN) ----------
// ---------- GEMINI CALL (STABLE FREE MODEL) ----------
let aiResponse;

try {
  aiResponse = await ai.generate({
    model: "googleai/gemini-2.5-flash",
    system: systemPrompt,
    messages
  });
} catch (err: any) {
  console.error("Gemini error:", err);
  throw new Error(`AI_ERROR: ${err.message}`);
}

// ---------- تأكيد الإخراج ----------
if (!aiResponse || !aiResponse.text) {
  console.error("AI returned empty response:", aiResponse);
  throw new Error("Empty output from AI model");
}

const finalText = aiResponse.text;

// ---------- اكتشاف اسم الكتاب ----------
let detectedBook: string | undefined = undefined;

if (input.availableBooks && input.availableBooks.length > 0) {
  for (const book of input.availableBooks) {
    const short = book.fileName.replace(".pdf", "").trim();
    if (finalText.includes(short)) {
      detectedBook = book.fileName;
      break;
    }
  }
}

// ---------- الإخراج النهائي ----------
return {
  answer: finalText,
  source: detectedBook ? "textbook" : answerSource,
  sourceBookName: detectedBook
};

  } catch (error) {
      console.error('Error in answerStudyQuestionFlow:', error);
      throw error;
    }
  }
);
