import { z } from "zod";

export const personSchema = z.object({
  parentName: z.string().trim().min(2, "Enter the parent name.").max(120),
  email: z.email("Enter a valid email.").trim().toLowerCase(),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a phone number.")
    .max(30)
    .refine((value) => value.replace(/\D/g, "").length >= 7, "Enter a phone number."),
  playerName: z.string().trim().min(2, "Enter the player name.").max(120),
  acceptWaiver: z.boolean().refine((value) => value, "Accept the waiver before paying."),
});

export const contactSchema = z.object({
  firstName: z.string().trim().min(1, "Enter a first name.").max(80),
  lastName: z.string().trim().min(1, "Enter a last name.").max(80),
  email: z.email("Enter a valid email.").trim().toLowerCase(),
  subject: z.string().trim().max(160).optional().or(z.literal("")),
  message: z.string().trim().min(1, "Enter a message.").max(5000),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a phone number.")
    .max(30)
    .refine((value) => value.replace(/\D/g, "").length >= 7, "Enter a phone number."),
});

export function zodMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Check the form and try again.";
}
