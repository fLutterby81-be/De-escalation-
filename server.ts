import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/generate-instruction", async (req, res) => {
    try {
      const { timeSinceLastAction, actionCount = 0, timeOfDay = "dag", language = "en" } = req.body;
      
      let pacingContext = "";
      if (timeSinceLastAction !== undefined) {
        if (timeSinceLastAction < 4000) {
          pacingContext = "De gebruiker klikt erg snel (minder dan 4 seconden). Ze zijn mogelijk in paniek of gehaast. Geef extreem kleine, geruststellende instructies om te aarden.";
        } else if (timeSinceLastAction > 20000) {
          pacingContext = "De gebruiker wacht lang tussen acties (meer dan 20 seconden). Ze zitten mogelijk vast in een diepe 'freeze'. Geef een uiterst minimale, niet-bedreigende fysieke instructie.";
        } else {
          pacingContext = "De gebruiker volgt een gemiddeld tempo. Blijf gestage, veilige instructies geven.";
        }
      }

      const countContext = actionCount > 5 
        ? "De gebruiker heeft al meerdere stappen gedaan en bouwt momentum op. Je mag iets meer actieve instructies geven (zoals strekken of om zich heen kijken)." 
        : "De gebruiker is pas net begonnen. Houd de instructies uiterst klein en lokaal.";

      const timeContext = `Het is nu de ${timeOfDay}. Pas de toon of instructie subtiel hierop aan als dat passend is (bijv. rustig in de avond, iets opwekkender in de ochtend).`;
      const langContext = language === "en" ? "Geef de instructie uitsluitend in het Engels." : "Geef de instructie uitsluitend in het Nederlands.";

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `De gebruiker heeft op de 'Help me' of 'Nog eentje' knop gedrukt.\n${pacingContext}\n${countContext}\n${timeContext}\n${langContext}\nGeef een micro-instructie.`,
        config: {
          systemInstruction: `Je bent een de-escalatie assistent ontworpen om gebruikers te helpen die acute fysieke en emotionele overprikkeling ervaren, of die vastzitten in een 'freeze' respons.

Jouw absolute regels:
1. Gebruik nooit meer dan twee korte zinnen.
2. Stel geen open vragen (zoals "Hoe voel je je?" of "Waarom?").
3. Toon empathie niet via lange teksten of analyses, maar door direct een veilige oplossing te bieden.
4. Geef altijd precies één fysieke micro-stap als opdracht (bijv. "Kijk naar links", "Beweeg je pink", "Haal één keer diep adem").
5. Als de gebruiker aangeeft nog steeds vast te zitten, breek de actie dan op in een nog kleinere , fysiek minder eisende stap.`,
          temperature: 0.7,
        },
      });

      const instruction = response.text || (language === "en" ? "Take one deep breath." : "Haal één keer diep adem.");
      res.json({ instruction });
    } catch (error: any) {
      if (error?.status !== 429 && error?.error?.code !== 429) {
        console.error("Error calling Gemini API:", error);
      }
      res.status(500).json({ instruction: req.body.language === "en" ? "Only move your right index finger." : "Beweeg alleen je rechter wijsvinger." }); // Fallback on error
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
