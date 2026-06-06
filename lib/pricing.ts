const WEEKDAY_RATE = 800;
const WEEKEND_RATE = 1000;

export function parseDateOnly(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function isWeekend(date: string | Date) {
  const value = typeof date === "string" ? parseDateOnly(date) : date;
  return value.getDay() === 0 || value.getDay() === 6;
}

export function getHourlyRate(date: string | Date) {
  return isWeekend(date) ? WEEKEND_RATE : WEEKDAY_RATE;
}

export function calculateBookingPrice(date: string | Date, durationHours: number) {
  if (!Number.isInteger(durationHours) || durationHours < 1 || durationHours > 5) {
    throw new Error("Duration must be between 1 and 5 whole hours.");
  }

  return getHourlyRate(date) * durationHours;
}
