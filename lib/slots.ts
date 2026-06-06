import { getHourlyRate } from "@/lib/pricing";
import type { SlotAvailability } from "@/lib/types";

export const OPERATING_TIME_ZONE = "Asia/Kolkata";
export const OPENING_TIME = "09:30";
export const CLOSING_TIME = "23:30";
export const SLOT_INTERVAL_MINUTES = 30;
export const SLOT_COUNT = 28;
export const MAX_BOOKING_HOURS = 5;

export function timeToMinutes(time: string) {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function formatSlotLabel(time: string) {
  const minutes = timeToMinutes(time);
  const hours = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

export function generateSlotTimes() {
  const openingMinutes = timeToMinutes(OPENING_TIME);
  return Array.from({ length: SLOT_COUNT }, (_, index) =>
    minutesToTime(openingMinutes + index * SLOT_INTERVAL_MINUTES),
  );
}

export function getEndTime(startTime: string, durationHours: number) {
  return minutesToTime(timeToMinutes(startTime) + durationHours * 60);
}

export function isValidBookingWindow(startTime: string, durationHours: number) {
  return (
    generateSlotTimes().includes(startTime.slice(0, 5)) &&
    Number.isInteger(durationHours * 2) &&
    durationHours >= 0.5 &&
    durationHours <= MAX_BOOKING_HOURS &&
    timeToMinutes(getEndTime(startTime, durationHours)) <=
      timeToMinutes(CLOSING_TIME)
  );
}

export function formatDuration(durationHours: number) {
  const hours = Math.floor(durationHours);
  const minutes = Math.round((durationHours - hours) * 60);
  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours} hr${hours === 1 ? "" : "s"}`;
  return `${hours} hr ${minutes} min`;
}

export function generateDurations() {
  return Array.from({ length: MAX_BOOKING_HOURS * 2 }, (_, index) => (index + 1) / 2);
}

export function rangesOverlap(
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
) {
  return (
    timeToMinutes(firstStart) < timeToMinutes(secondEnd) &&
    timeToMinutes(firstEnd) > timeToMinutes(secondStart)
  );
}

export function getIndiaNowParts(now = new Date()) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: OPERATING_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

export function isSlotInPast(date: string, startTime: string, now = new Date()) {
  const indiaNow = getIndiaNowParts(now);
  return (
    date < indiaNow.date ||
    (date === indiaNow.date &&
      timeToMinutes(startTime) <= timeToMinutes(indiaNow.time))
  );
}

export function createDemoSlots(date: string): SlotAvailability[] {
  const price = getHourlyRate(date);
  return generateSlotTimes().map((time) => ({
    time,
    label: formatSlotLabel(time),
    available: !isSlotInPast(date, time),
    price,
  }));
}
