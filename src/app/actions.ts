'use server';

import { z } from 'zod';

const telegramUserSchema = z.object({
  id: z.number(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  username: z.string().optional(),
}).nullable();

// This schema should ideally match the one in plan-form.tsx, 
// but we'll keep it flexible to accept the massaged data.
const webhookSchema = z.object({
  governorate: z.string(),
  month: z.string(),
  presidentSign: z.string(),
  deputySigns: z.array(z.string()),
  events: z.array(
    z.object({
      name: z.string(),
      date: z.string(),
      type: z.string(),
      result: z.string(),
    })
  ),
  telegramUser: telegramUserSchema,
});

type FormState = {
  message: string;
  success: boolean;
};

export async function submitPlan(
  data: z.infer<typeof webhookSchema>
): Promise<FormState> {
  // The data is already shaped by the client component, so we can send it directly.
  // We can still do a final validation here.
  const validatedFields = webhookSchema.safeParse(data);

  if (!validatedFields.success) {
    console.error('Validation Errors:', validatedFields.error.flatten());
    return {
      message: 'Invalid data format. Please check your inputs.',
      success: false,
    };
  }

  try {
    const response = await fetch('https://submit.tahyamisrsu.com/webhook/plan-oc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validatedFields.data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Webhook Error:', errorText);
      return {
        message: `Submission failed. The server responded with status: ${response.status}.`,
        success: false,
      };
    }

    return {
      message: 'Plan submitted successfully!',
      success: true,
    };
  } catch (error) {
    console.error('Network or other error:', error);
    return {
      message: 'An unexpected error occurred. Please try again later.',
      success: false,
    };
  }
}
