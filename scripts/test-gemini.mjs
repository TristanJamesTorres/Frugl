import { GoogleGenAI } from "@google/genai";
import fs from "node:fs";
import path from "node:path";

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL;

async function generateWithRetry(ai, request) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await ai.models.generateContent(request);
    } catch (error) {
      const message = String(error?.message ?? error);
      const retryable = ["429", "503", "504", "RESOURCE_EXHAUSTED", "UNAVAILABLE", "DEADLINE_EXCEEDED"]
        .some((code) => message.includes(code));
      if (!retryable || attempt === 1) throw error;
      console.warn("Temporary Gemini error; retrying once...");
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
}

if (!apiKey) {
  console.error("GEMINI_API_KEY is missing. Check .env.local and the --env-file flag.");
  process.exitCode = 1;
} else if (!model) {
  console.error("GEMINI_MODEL is missing. Add the model name from Google AI Studio to .env.local.");
  process.exitCode = 1;
} else {
  const imagePath = process.argv[2] ? path.resolve(process.argv[2]) : null;
  const mimeTypes = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  };
  const extension = imagePath ? path.extname(imagePath).toLowerCase() : null;
  const mimeType = extension ? mimeTypes[extension] : null;

  if (imagePath && !mimeType) {
    console.error("Use a .jpg, .jpeg, .png, or .webp image.");
    process.exitCode = 1;
  } else if (imagePath && !fs.existsSync(imagePath)) {
    console.error("Image file not found:", imagePath);
    process.exitCode = 1;
  } else {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { timeout: 15_000, retryOptions: { attempts: 1 } },
    });
    const parts = imagePath
      ? [
          {
            inlineData: {
              mimeType,
              data: fs.readFileSync(imagePath).toString("base64"),
            },
          },
          {
            text:
              "This is a photo of a laptop. Return JSON only with these keys: " +
              "brand, series, modelNumber, visibleText (array of strings read from the photo), " +
              "confidence (number from 0 to 1). Use null for anything you cannot see. " +
              "Do not guess.",
          },
        ]
      : [{ text: "Reply with exactly the word: OK" }];

    try {
      const response = await generateWithRetry(ai, {
        model,
        contents: [{ role: "user", parts }],
        ...(imagePath ? { config: { responseMimeType: "application/json" } } : {}),
      });
      console.log("Model:", model);
      console.log("Response:", response.text);
    } catch (error) {
      console.error("Request failed:", error?.status ?? "", error?.message ?? error);
      process.exitCode = 1;
    }
  }
}
