'use server';

/**
 * @fileOverview Generate practice questions from textbook content using Groq.
 */

import { z } from 'zod';
import { askAI } from '@/ai/router';

const GeneratePracticeQuestionsInputSchema = z.object({
  textbookContent: z.string(),
  numberOfQuestions: z.number().min(1).max(10).default(3),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
});

export type GeneratePracticeQuestionsInput = z.infer<typeof GeneratePracticeQuestionsInputSchema>;

const GeneratePracticeQuestionsOutputSchema = z.object({
  questions: z.array(z.string()),
});

export type GeneratePracticeQuestionsOutput = z.infer<typeof GeneratePracticeQuestionsOutputSchema>;

export async function generatePracticeQuestions(
  input: GeneratePracticeQuestionsInput
): Promise<GeneratePracticeQuestionsOutput> {
  const systemPrompt = `You are an expert educator creating practice questions for high school students.
Generate exactly ${input.numberOfQuestions} practice questions of ${input.difficulty} difficulty.

You MUST respond with valid JSON only:
{
  "questions": ["question1", "question2", ...]
}`;

  const response = await askAI({
    system: systemPrompt,
    question: `Generate practice questions from this textbook content:\n\n${input.textbookContent}`,
    jsonMode: true,
  });

  try {
    const parsed = JSON.parse(response);
    return { questions: parsed.questions || [] };
  } catch {
    return { questions: [] };
  }
}
