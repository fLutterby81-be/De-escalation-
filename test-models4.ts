import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: "Generate audio from this text: test" }] }],
      config: {
        responseModalities: ["AUDIO"],
      },
    });
    console.log(JSON.stringify(response.candidates?.[0]?.content, null, 2));
  } catch (e) {
    console.error(e);
  }
}
run();
