# De-escalation

Een prikkelarme web-app voor acute overprikkeling of een "freeze"-reactie.
Eén knop, **Help me**, geeft telkens één kleine fysieke stap. Gemini past de stap
aan aan het tempo van de gebruiker, het aantal stappen en het moment van de dag.
Zonder netwerk of API-sleutel valt de app direct terug op ingebouwde stappen.

Verder bevat de app:

- een rustig ademend achtergrondgeluid (bruine ruis) dat je aan en uit zet;
- een knop naar 112 en een knop naar een chathulplijn
  (Zelfmoordlijn 1813 in het Nederlands, findahelpline.com in het Engels);
- Nederlands en Engels, automatisch gekozen op basis van de browsertaal.

## Lokaal draaien

Vereist Node.js 20 of nieuwer.

```bash
npm install
cp .env.example .env   # vul GEMINI_API_KEY in
npm run dev            # http://localhost:3000
```

## Scripts

| Script          | Wat het doet                                              |
| --------------- | --------------------------------------------------------- |
| `npm run dev`   | Express-server met Vite-middleware en hot reload          |
| `npm run build` | Bouwt de frontend en bundelt de server naar `dist/`       |
| `npm start`     | Start de gebouwde productieserver uit `dist/`             |
| `npm test`      | Unit tests voor de promptopbouw en invoervalidatie        |
| `npm run lint`  | TypeScript-typecheck                                      |

## Configuratie

| Variabele        | Standaard               | Uitleg                                  |
| ---------------- | ----------------------- | --------------------------------------- |
| `GEMINI_API_KEY` | geen                    | Zonder sleutel gebruikt de app alleen de ingebouwde stappen. |
| `GEMINI_MODEL`   | `gemini-3.5-flash-lite` | Gemini-model voor de micro-instructies. |
| `PORT`           | `3000`                  | Poort van de server.                    |

## Structuur

- `server.ts` is de Express-server met het endpoint `POST /api/generate-instruction`.
- `server/instruction.ts` valideert de invoer, bouwt de prompt en schoont het antwoord op.
- `src/App.tsx` bevat de volledige interface.
- `src/audio.ts` genereert het achtergrondgeluid met de Web Audio API.
- `src/i18n.ts` bevat de teksten, ingebouwde stappen en taalkeuze.
