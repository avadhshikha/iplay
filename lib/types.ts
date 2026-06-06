export type BookingStatus = "confirmed" | "cancelled" | "pending";

export type SlotAvailability = {
  time: string;
  label: string;
  available: boolean;
  price: number;
};

export type BookingRequest = {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  booking_date: string;
  start_time: string;
  duration_hours: number;
  notes?: string;
};
