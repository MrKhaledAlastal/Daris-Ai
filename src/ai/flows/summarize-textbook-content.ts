'use server';

/**
 * @fileOverview Summarize textbook content using Groq.
 */

import { z } from 'zod';
import { askAI } from '@/ai/router';

const SummarizeTextbookContentInputSchema = z.object({
  textbookSection: z.string(),
});

export type SummarizeTextbookContentInput = z.infer<typeof SummarizeTextbookContentInputSchema>;

const SummarizeTextbookContentOutputSchema = z.object({
  summary: z.string(),
});

export type SummarizeTextbookContentOutput = z.infer<typeof SummarizeTextbookContentOutputSchema>;

export async function summarizeTextbookContent(
  input: SummarizeTextbookContentInput
): Promise<SummarizeTextbookContentOutput> {
  const systemPrompt = `You are an expert summarizer. Distill complex information into key points.
Respond with valid JSON only:
{
  "summary": "your summary here"
}`;

  const response = await askAI({
    system: systemPrompt,
    question: `Summarize the following textbook section:\n\n${input.textbookSection}`,
    jsonMode: true,
  });

  try {
    const parsed = JSON.parse(response);
    return { summary: parsed.summary || response };
  } catch {
    return { summary: response };
  }
}
