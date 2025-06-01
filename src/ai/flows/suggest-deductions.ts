
'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestDeductionsInputSchema = z.object({
  financialData: z.string().describe('A summary of the user\'s financial data, including income and expenses.'),
  uploadedDocuments: z
    .array(z.string())
    .describe(
      'An array of data URIs, each representing an uploaded document relevant to tax deductions. Each data URI must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});

export type SuggestDeductionsInput = z.infer<typeof SuggestDeductionsInputSchema>;

const SuggestDeductionsOutputSchema = z.object({
  suggestedDeductions: z
    .array(z.string())
    .describe('An array of potential tax deductions the user might be eligible for, with brief explanations.'),
  summary: z.string().describe('A concise summary of the analysis and the rationale behind the suggested deductions.'),
});

export type SuggestDeductionsOutput = z.infer<typeof SuggestDeductionsOutputSchema>;

export async function suggestDeductions(input: SuggestDeductionsInput): Promise<SuggestDeductionsOutput> {
  return suggestDeductionsFlow(input);
}

const exampleOutputForPrompt = {
  suggestedDeductions: [
    "Example Deduction 1: e.g., Home office expenses if criteria are met.",
    "Example Deduction 2: e.g., Portion of medical bills exceeding AGI threshold."
  ],
  summary: "This is a sample summary. Based on the provided information, these are potential areas for tax deductions. Further review by a tax professional is recommended."
};

const prompt = ai.definePrompt({
  name: 'suggestDeductionsPrompt',
  input: {schema: SuggestDeductionsInputSchema},
  output: {schema: SuggestDeductionsOutputSchema},
  prompt: `You are an expert tax advisor. Analyze the following financial data and uploaded documents to suggest potential tax deductions the user might be eligible for.

Financial Data: {{{financialData}}}

Uploaded Documents:
{{#each uploadedDocuments}}
- {{media url=this}}
{{/each}}

Based on this information, provide a list of potential tax deductions and a summary of your analysis.

Format your response as a JSON object. Here is an example of the expected structure:
${JSON.stringify(exampleOutputForPrompt, null, 2)}`,
});

const suggestDeductionsFlow = ai.defineFlow(
  {
    name: 'suggestDeductionsFlow',
    inputSchema: SuggestDeductionsInputSchema,
    outputSchema: SuggestDeductionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {

      console.error("LLM did not return valid output for suggestDeductionsFlow");
      return {
        suggestedDeductions: ["Error: AI failed to generate suggestions. Please check logs."],
        summary: "An error occurred while trying to generate deduction suggestions."
      };
    }
    return output;
  }
);
