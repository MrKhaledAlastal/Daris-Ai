'use server';

/**
 * @fileOverview A flow for generating practice questions based on textbook content.
 *
 * - generatePracticeQuestions - A function that generates practice questions.
 * - GeneratePracticeQuestionsInput - The input type for the generatePracticeQuestions function.
 * - GeneratePracticeQuestionsOutput - The return type for the generatePracticeQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePracticeQuestionsInputSchema = z.object({
  textbookContent: z
    .string()
    .describe('The content of the textbook to generate questions from.'),
  numberOfQuestions: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('The number of practice questions to generate.'),
  difficulty: z
    .enum(['easy', 'medium', 'hard'])
    .default('medium')
    .describe('The difficulty level of the practice questions.'),
});
export type GeneratePracticeQuestionsInput = z.infer<typeof GeneratePracticeQuestionsInputSchema>;

const GeneratePracticeQuestionsOutputSchema = z.object({
  questions: z.array(z.string()).describe('The generated practice questions.'),
});
export type GeneratePracticeQuestionsOutput = z.infer<typeof GeneratePracticeQuestionsOutputSchema>;

export async function generatePracticeQuestions(
  input: GeneratePracticeQuestionsInput
): Promise<GeneratePracticeQuestionsOutput> {
  return generatePracticeQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePracticeQuestionsPrompt',
  model: 'gemini-1.5-flash',
  input: {schema: GeneratePracticeQuestionsInputSchema},
  output: {schema: GeneratePracticeQuestionsOutputSchema},
  prompt: `You are an expert educator specializing in creating practice questions for high school students.

  Based on the textbook content provided, generate {{numberOfQuestions}} practice questions of {{difficulty}} difficulty.

  Textbook Content:
  {{textbookContent}}

  Format the output as a JSON object with a "questions" field containing an array of strings.
  `,config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
    ],
  },
});

const generatePracticeQuestionsFlow = ai.defineFlow(
  {
    name: 'generatePracticeQuestionsFlow',
    inputSchema: GeneratePracticeQuestionsInputSchema,
    outputSchema: GeneratePracticeQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
