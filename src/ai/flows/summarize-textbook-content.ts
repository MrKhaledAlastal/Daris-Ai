'use server';

/**
 * @fileOverview Summarizes sections of uploaded textbooks for quick comprehension.
 *
 * - summarizeTextbookContent - A function that handles the summarization process.
 * - SummarizeTextbookContentInput - The input type for the summarizeTextbookContent function.
 * - SummarizeTextbookContentOutput - The return type for the summarizeTextbookContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeTextbookContentInputSchema = z.object({
  textbookSection: z
    .string()
    .describe('The section of the textbook to be summarized.'),
});
export type SummarizeTextbookContentInput = z.infer<
  typeof SummarizeTextbookContentInputSchema
>;

const SummarizeTextbookContentOutputSchema = z.object({
  summary: z
    .string()
    .describe('A concise summary of the textbook section.'),
});
export type SummarizeTextbookContentOutput = z.infer<
  typeof SummarizeTextbookContentOutputSchema
>;

export async function summarizeTextbookContent(
  input: SummarizeTextbookContentInput
): Promise<SummarizeTextbookContentOutput> {
  return summarizeTextbookContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeTextbookContentPrompt',
  model: 'gemini-1.5-flash',
  input: {schema: SummarizeTextbookContentInputSchema},
  output: {schema: SummarizeTextbookContentOutputSchema},
  prompt: `You are an expert summarizer, able to distill complex information into its key points.\n\nSummarize the following textbook section:\n\n{{{textbookSection}}}`,
});

const summarizeTextbookContentFlow = ai.defineFlow(
  {
    name: 'summarizeTextbookContentFlow',
    inputSchema: SummarizeTextbookContentInputSchema,
    outputSchema: SummarizeTextbookContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
