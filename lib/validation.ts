import { z } from "zod";

export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format.")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, "Enter a real calendar date.");

export const bookingRequestSchema = z.object({
  customer_name: z.string().trim().min(2).max(100),
  customer_phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid Indian mobile number."),
  customer_email: z.string().email().optional().or(z.literal("")),
  booking_date: dateOnlySchema,
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  duration_hours: z.number().min(0.5).max(5).refine((value) => Number.isInteger(value * 2)),
  payment_mode: z.enum(["cash", "upi"]),
  notes: z.string().trim().max(200).optional().or(z.literal("")),
});
