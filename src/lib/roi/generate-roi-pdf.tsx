/* eslint-disable @typescript-eslint/no-explicit-any */
// Server-side ROI PDF generator. Takes a typed RoiPdfData payload, renders
// the React-PDF document to a Buffer, returns base64 string ready for the
// Resend HTTP attachment payload.
import { renderToBuffer } from '@react-pdf/renderer';
import { RoiPdfDocument, type RoiPdfData } from './RoiPdf';

export async function generateRoiPdfBase64(data: RoiPdfData): Promise<string> {
  // @react-pdf/renderer renderToBuffer Node Buffer döndürür; base64 string
  // Resend `attachments[].content` sözleşmesiyle birebir uyumludur.
  // Cast: TS, RoiPdfDocument wrapper'ını <Document> ReactElement'ı olarak
  // resolve edemiyor — runtime'da wrapper içinde <Document> döndürüyor ve
  // react-pdf'in mount sözleşmesi aynı, sadece type ayrımı.
  const element = (<RoiPdfDocument data={data} />) as any;
  const buffer = await renderToBuffer(element);
  return buffer.toString('base64');
}

export type { RoiPdfData };
