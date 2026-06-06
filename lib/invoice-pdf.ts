import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

import type { AdminInvoice } from "@/lib/admin-data";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const GREEN = rgb(0.09, 0.4, 0.2);
const GREEN_DARK = rgb(0.03, 0.2, 0.1);
const GREEN_LIGHT = rgb(0.91, 0.97, 0.93);
const SLATE = rgb(0.28, 0.34, 0.39);
const SLATE_LIGHT = rgb(0.91, 0.93, 0.94);
const WHITE = rgb(1, 1, 1);

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${value}T00:00:00+05:30`));
}

function academyLabel(type: AdminInvoice["academyType"]) {
  return {
    yoga: "Yoga by Shikha",
    chess: "Chess Academy",
    cricket: "Cricket Academy",
  }[type];
}

function money(amount: number) {
  return `INR ${amount.toLocaleString("en-IN")}`;
}

function drawLabelValue(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  label: string,
  value: string,
  x: number,
  y: number,
) {
  page.drawText(label.toUpperCase(), {
    x,
    y,
    size: 7.5,
    font: fonts.bold,
    color: SLATE,
  });
  page.drawText(value, {
    x,
    y: y - 16,
    size: 10.5,
    font: fonts.regular,
    color: GREEN_DARK,
  });
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export async function createInvoicePdf(invoice: AdminInvoice) {
  const document = await PDFDocument.create();
  document.setTitle(`${invoice.invoiceNumber} - ${invoice.customerName}`);
  document.setAuthor("I-Play");
  document.setSubject("Customer invoice");
  document.setCreator("I-Play Admin");

  const page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const fonts = {
    regular: await document.embedFont(StandardFonts.Helvetica),
    bold: await document.embedFont(StandardFonts.HelveticaBold),
  };

  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 170,
    width: PAGE_WIDTH,
    height: 170,
    color: GREEN_DARK,
  });
  page.drawRectangle({
    x: MARGIN,
    y: PAGE_HEIGHT - 105,
    width: 42,
    height: 42,
    color: GREEN,
    borderColor: rgb(0.25, 0.68, 0.4),
    borderWidth: 1,
  });
  page.drawText("IP", {
    x: MARGIN + 11,
    y: PAGE_HEIGHT - 91,
    size: 14,
    font: fonts.bold,
    color: WHITE,
  });
  page.drawText("I-PLAY", {
    x: MARGIN + 54,
    y: PAGE_HEIGHT - 80,
    size: 19,
    font: fonts.bold,
    color: WHITE,
  });
  page.drawText("TURF BOOKING & ACADEMIES", {
    x: MARGIN + 54,
    y: PAGE_HEIGHT - 98,
    size: 7.5,
    font: fonts.bold,
    color: rgb(0.7, 0.86, 0.75),
  });
  page.drawText("INVOICE", {
    x: PAGE_WIDTH - MARGIN - 112,
    y: PAGE_HEIGHT - 78,
    size: 24,
    font: fonts.bold,
    color: WHITE,
  });
  page.drawText(invoice.invoiceNumber, {
    x: PAGE_WIDTH - MARGIN - 112,
    y: PAGE_HEIGHT - 100,
    size: 10,
    font: fonts.regular,
    color: rgb(0.75, 0.87, 0.78),
  });

  const status = invoice.status.toUpperCase();
  const statusWidth = fonts.bold.widthOfTextAtSize(status, 8) + 22;
  page.drawRectangle({
    x: PAGE_WIDTH - MARGIN - statusWidth,
    y: PAGE_HEIGHT - 140,
    width: statusWidth,
    height: 22,
    color:
      invoice.status === "paid"
        ? rgb(0.23, 0.67, 0.36)
        : invoice.status === "pending"
          ? rgb(0.86, 0.57, 0.12)
          : rgb(0.72, 0.2, 0.23),
  });
  page.drawText(status, {
    x: PAGE_WIDTH - MARGIN - statusWidth + 11,
    y: PAGE_HEIGHT - 133,
    size: 8,
    font: fonts.bold,
    color: WHITE,
  });

  page.drawText("BILL TO", {
    x: MARGIN,
    y: PAGE_HEIGHT - 214,
    size: 8,
    font: fonts.bold,
    color: GREEN,
  });
  page.drawText(invoice.customerName, {
    x: MARGIN,
    y: PAGE_HEIGHT - 240,
    size: 17,
    font: fonts.bold,
    color: GREEN_DARK,
  });
  page.drawText(invoice.phone, {
    x: MARGIN,
    y: PAGE_HEIGHT - 260,
    size: 10,
    font: fonts.regular,
    color: SLATE,
  });
  if (invoice.email) {
    page.drawText(invoice.email, {
      x: MARGIN,
      y: PAGE_HEIGHT - 277,
      size: 10,
      font: fonts.regular,
      color: SLATE,
    });
  }

  drawLabelValue(
    page,
    fonts,
    "Invoice date",
    formatDate(invoice.invoiceDate),
    PAGE_WIDTH - MARGIN - 150,
    PAGE_HEIGHT - 218,
  );
  drawLabelValue(
    page,
    fonts,
    "Payment",
    invoice.status === "paid"
      ? `Received via ${invoice.paymentMode.toUpperCase()}`
      : `Due · ${invoice.paymentMode.toUpperCase()}`,
    PAGE_WIDTH - MARGIN - 150,
    PAGE_HEIGHT - 265,
  );

  const tableTop = PAGE_HEIGHT - 330;
  page.drawRectangle({
    x: MARGIN,
    y: tableTop - 34,
    width: PAGE_WIDTH - MARGIN * 2,
    height: 34,
    color: GREEN_DARK,
  });
  page.drawText("DESCRIPTION", {
    x: MARGIN + 14,
    y: tableTop - 22,
    size: 8,
    font: fonts.bold,
    color: WHITE,
  });
  page.drawText("CATEGORY", {
    x: 330,
    y: tableTop - 22,
    size: 8,
    font: fonts.bold,
    color: WHITE,
  });
  page.drawText("AMOUNT", {
    x: PAGE_WIDTH - MARGIN - 70,
    y: tableTop - 22,
    size: 8,
    font: fonts.bold,
    color: WHITE,
  });

  page.drawRectangle({
    x: MARGIN,
    y: tableTop - 112,
    width: PAGE_WIDTH - MARGIN * 2,
    height: 78,
    color: rgb(0.97, 0.985, 0.975),
    borderColor: SLATE_LIGHT,
    borderWidth: 0.7,
  });
  const description = invoice.description || `${academyLabel(invoice.academyType)} fee`;
  const descriptionLines = wrapText(description, fonts.bold, 10.5, 235).slice(0, 3);
  descriptionLines.forEach((line, index) => {
    page.drawText(line, {
      x: MARGIN + 14,
      y: tableTop - 62 - index * 15,
      size: 10.5,
      font: fonts.bold,
      color: GREEN_DARK,
    });
  });
  page.drawText(academyLabel(invoice.academyType), {
    x: 330,
    y: tableTop - 63,
    size: 9.5,
    font: fonts.regular,
    color: SLATE,
  });
  const amountText = money(invoice.amount);
  page.drawText(amountText, {
    x: PAGE_WIDTH - MARGIN - fonts.bold.widthOfTextAtSize(amountText, 10.5) - 14,
    y: tableTop - 63,
    size: 10.5,
    font: fonts.bold,
    color: GREEN_DARK,
  });

  const totalTop = tableTop - 148;
  page.drawLine({
    start: { x: 330, y: totalTop },
    end: { x: PAGE_WIDTH - MARGIN, y: totalTop },
    thickness: 1,
    color: SLATE_LIGHT,
  });
  page.drawText("TOTAL", {
    x: 344,
    y: totalTop - 31,
    size: 9,
    font: fonts.bold,
    color: SLATE,
  });
  page.drawText(amountText, {
    x: PAGE_WIDTH - MARGIN - fonts.bold.widthOfTextAtSize(amountText, 18),
    y: totalTop - 36,
    size: 18,
    font: fonts.bold,
    color: GREEN,
  });

  const noteY = totalTop - 122;
  page.drawRectangle({
    x: MARGIN,
    y: noteY,
    width: PAGE_WIDTH - MARGIN * 2,
    height: 72,
    color: GREEN_LIGHT,
  });
  page.drawText("THANK YOU", {
    x: MARGIN + 16,
    y: noteY + 48,
    size: 9,
    font: fonts.bold,
    color: GREEN,
  });
  page.drawText("Thank you for being part of I-Play.", {
    x: MARGIN + 16,
    y: noteY + 27,
    size: 11,
    font: fonts.bold,
    color: GREEN_DARK,
  });
  page.drawText("For payment questions, please contact the I-Play team.", {
    x: MARGIN + 16,
    y: noteY + 11,
    size: 8.5,
    font: fonts.regular,
    color: SLATE,
  });

  page.drawLine({
    start: { x: MARGIN, y: 64 },
    end: { x: PAGE_WIDTH - MARGIN, y: 64 },
    thickness: 0.7,
    color: SLATE_LIGHT,
  });
  page.drawText("I-Play | Turf Booking & Academies", {
    x: MARGIN,
    y: 43,
    size: 8,
    font: fonts.bold,
    color: GREEN_DARK,
  });
  page.drawText("Computer-generated invoice", {
    x:
      PAGE_WIDTH -
      MARGIN -
      fonts.regular.widthOfTextAtSize("Computer-generated invoice", 8),
    y: 43,
    size: 8,
    font: fonts.regular,
    color: SLATE,
  });

  return document.save();
}
