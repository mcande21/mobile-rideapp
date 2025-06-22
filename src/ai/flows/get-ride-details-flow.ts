'use server';
/**
 * @fileOverview A Genkit flow for getting ride details like duration.
 *
 * This flow simulates a call to a mapping service to get the estimated
 * travel time for a ride based on pickup and dropoff locations.
 *
 * - getRideDetails - A function that returns the estimated ride duration.
 * - GetRideDetailsInput - The input type for the getRideDetails function.
 * - GetRideDetailsOutput - The return type for the getRideDetails function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GetRideDetailsInputSchema = z.object({
  pickup: z.string().describe('The pickup location for the ride.'),
  dropoff: z.string().describe('The dropoff location for the ride.'),
});
export type GetRideDetailsInput = z.infer<typeof GetRideDetailsInputSchema>;

const GetRideDetailsOutputSchema = z.object({
  duration: z
    .number()
    .describe('The estimated ride duration in minutes.'),
});
export type GetRideDetailsOutput = z.infer<typeof GetRideDetailsOutputSchema>;

export async function getRideDetails(
  input: GetRideDetailsInput
): Promise<GetRideDetailsOutput> {
  return getRideDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getRideDetailsPrompt',
  input: { schema: GetRideDetailsInputSchema },
  output: { schema: GetRideDetailsOutputSchema },
  prompt: `You are a ride details calculator. Your task is to estimate the ride duration in minutes based on pickup and dropoff locations.
  
  This is a mock API. Use the following logic: the duration in minutes is the total number of characters in the pickup and dropoff strings multiplied by 1.5. Round to the nearest integer.
  
  Pickup: {{{pickup}}}
  Dropoff: {{{dropoff}}}
  
  Calculate the duration and return it.
  `,
});

const getRideDetailsFlow = ai.defineFlow(
  {
    name: 'getRideDetailsFlow',
    inputSchema: GetRideDetailsInputSchema,
    outputSchema: GetRideDetailsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Unable to calculate ride details.');
    }
    output.duration = Math.round(output.duration);
    return output;
  }
);
