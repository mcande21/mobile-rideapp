'use server';
/**
 * @fileOverview A Genkit flow for suggesting a ride fare.
 *
 * - suggestFare - A function that suggests a fare based on pickup and dropoff.
 * - SuggestFareInput - The input type for the suggestFare function.
 * - SuggestFareOutput - The return type for the suggestFare function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SuggestFareInputSchema = z.object({
  pickup: z.string().describe('The pickup location for the ride.'),
  dropoff: z.string().describe('The dropoff location for the ride.'),
});
export type SuggestFareInput = z.infer<typeof SuggestFareInputSchema>;

const SuggestFareOutputSchema = z.object({
  fare: z.number().describe('The suggested fare for the ride.'),
});
export type SuggestFareOutput = z.infer<typeof SuggestFareOutputSchema>;

export async function suggestFare(input: SuggestFareInput): Promise<SuggestFareOutput> {
  return suggestFareFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestFarePrompt',
  input: { schema: SuggestFareInputSchema },
  output: { schema: SuggestFareOutputSchema },
  prompt: `You are a fare calculator for a ride-sharing app. Your task is to calculate a fare based on the pickup and dropoff locations.
  
  The calculation is simple: a base fare of $5, plus $0.75 for every character in the combined pickup and dropoff location strings.
  
  Pickup: {{{pickup}}}
  Dropoff: {{{dropoff}}}
  
  Calculate the fare and return it in the specified format. For example, if pickup is "123 Main" and dropoff is "Airport", the total length is 13, so the fare is 5 + (13 * 0.75) = 14.75.
  `,
});

const suggestFareFlow = ai.defineFlow(
  {
    name: 'suggestFareFlow',
    inputSchema: SuggestFareInputSchema,
    outputSchema: SuggestFareOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Unable to calculate fare.');
    }
    // Round to 2 decimal places to be safe
    output.fare = Math.round(output.fare * 100) / 100;
    return output;
  }
);
