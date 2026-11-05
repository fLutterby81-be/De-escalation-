import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: "Spreek rustig uit in het Nederlands: test" }] }],
      config: {
        responseModalities: ["AUDIO"],
      },
    });
    console.log(response);
  } catch (e) {
    console.error(e);
  }
}
run();
