import 'server-only';
import { GoogleGenAI } from '@google/genai';
import type { Hints, LaptopIdentifier, VisionResult } from './types';

const PROMPT =
  'You identify laptops from photos for a secondhand marketplace. ' +
  'Make a best-effort identification from logos, distinctive laptop design, and readable text; do not require a visible model number to identify a brand or family. ' +
  'Read every photo, especially model stickers, labels, BIOS screens, and Windows System Information or DxDiag screens. ' +
  'For series, return the most likely model family even if the exact generation is uncertain, and lower confidence when inferring from appearance. Use null only when there is not enough evidence to identify a brand or family. ' +
  'Reply with JSON only, using these keys: ' +
  'brand (string or null), ' +
  'series (string or null, for example ThinkPad T14 or Latitude 5420), ' +
  'modelNumber (string or null: the model, product, or system-model code shown on a label or information screen; never use a serial number), ' +
  'visibleText (array of strings: every readable piece of text on the laptop or its labels), ' +
  'confidence (number from 0 to 1: how sure you are about the exact brand and series, not just the brand). ' +
  'Use null for an uncertain series. Never invent a model number that is not visible, and do not infer CPU, GPU, RAM, or storage.';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

async function withRetry<T>(fn: () => Promise<T>, tries = 2): Promise<T> {
  let lastError: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      const msg = String(e?.message ?? e);
      const retryable = ['429', '503', '504', 'RESOURCE_EXHAUSTED', 'UNAVAILABLE', 'DEADLINE_EXCEEDED']
        .some((c) => msg.includes(c));
      if (!retryable || i === tries - 1) break;
      await sleep(1500 * (i + 1));
    }
  }
  throw lastError;
}

export class GeminiIdentifier implements LaptopIdentifier {
  async identify({ images, hints = {} }: { images: Buffer[]; hints?: Hints }): Promise<VisionResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.');
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { timeout: 25_000, retryOptions: { attempts: 1 } },
    });
    const used = Object.entries(hints).filter(([, v]) => v !== undefined && v !== '');
    const hintText = used.length ? ' The seller says (unverified): ' + used.map(([k, v]) => k + ' = ' + v).join(', ') + '.' : '';

    const parts: any[] = [{ text: PROMPT + hintText }];
    for (const img of images) parts.push({ inlineData: { mimeType: 'image/jpeg', data: img.toString('base64') } });

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
        contents: [{ role: 'user', parts }],
        config: { responseMimeType: 'application/json', temperature: 0.1 },
      })
    );

    let raw: any = {};
    try {
      raw = JSON.parse(response.text ?? '{}');
    } catch {
      raw = {};
    }
    const conf = Number(raw.confidence);
    return {
      brand: str(raw.brand),
      series: str(raw.series),
      modelNumber: str(raw.modelNumber),
      visibleText: Array.isArray(raw.visibleText) ? raw.visibleText.map(String).slice(0, 40) : [],
      confidence: Number.isFinite(conf) ? Math.min(1, Math.max(0, conf)) : 0,
      hintsUsed: used.map(([k]) => k),
    };
  }
}
