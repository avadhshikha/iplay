export type BookingStatus = "confirmed" | "cancelled" | "pending";
export type PaymentMode = "cash" | "upi";

export type SlotAvailability = {
  time: string;
  label: string;
  available: boolean;
  price: number;
};

export type DateAvailability = {
  date: string;
  availableSlots: number;
};

export type BookingRequest = {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  booking_date: string;
  start_time: string;
  duration_hours: number;
  payment_mode: PaymentMode;
  notes?: string;
};
