# De-escalation

Een prikkelarme web-app voor acute overprikkeling of een "freeze"-reactie.
Eén knop, **Help me**, geeft telkens één kleine fysieke stap. De app kiest de stap
op basis van het tempo van de gebruiker en het aantal stappen dat al gezet is.
Alles gebeurt in de browser en er is geen server. Op Vercel telt Vercel Web Analytics
anonieme paginabezoeken, zonder cookies. Wat iemand in de app doet, wordt niet bijgehouden.

Hoe de volgende stap gekozen wordt:

- de eerste stap, snel klikken of lang wachten geeft een uiterst kleine stap;
- bij een rustig tempo volgt een kleine, veilige stap;
- na meer dan vijf stappen in een rustig tempo mag de stap iets actiever zijn;
- de laatste vier getoonde stappen worden niet herhaald.

Verder bevat de app:

- een rustig ademend achtergrondgeluid (bruine ruis) dat je aan en uit zet;
- een knop naar 112 en een knop naar een chathulplijn
  (Zelfmoordlijn 1813 in het Nederlands, findahelpline.com in het Engels);
- Nederlands en Engels, automatisch gekozen op basis van de browsertaal;
- een licht, zacht ontwerp overdag en een gedimde donkere modus 's nachts;
  de donkere modus gaat aan tussen 21 en 7 uur of als het toestel in donkere modus staat;
- een knop met een maan of zon om zelf te wisselen; die keuze wordt onthouden,
  en wie terugkiest wat automatisch zou gelden, gaat terug naar automatisch;
- een optionele knop "Buy me a coffee" op het rustige startscherm, nooit tijdens een hulpsessie.

## Lokaal draaien

Vereist Node.js 20 of nieuwer.

```bash
npm install
npm run dev            # http://localhost:3000
```

## Scripts

| Script            | Wat het doet                                      |
| ----------------- | ------------------------------------------------- |
| `npm run dev`     | Ontwikkelserver met hot reload                    |
| `npm run build`   | Bouwt de statische site naar `dist/`              |
| `npm run preview` | Toont de gebouwde site uit `dist/`                |
| `npm test`        | Unit tests voor de keuze van de stappen           |
| `npm run lint`    | TypeScript-typecheck                              |

De map `dist/` kan op elke statische host gezet worden.

Vercel Web Analytics werkt alleen op Vercel en pas nadat Web Analytics in het
Vercel-dashboard van het project is aangezet. Op andere hosts doet het niets.

## Buy me a coffee

De knop blijft verborgen tot er een link is. Zet je link op een van deze twee plaatsen:

- in `src/config.ts`, bij `DEFAULT_BUY_ME_A_COFFEE_URL`;
- of als omgevingsvariabele `VITE_BUY_ME_A_COFFEE_URL` tijdens de build,
  bijvoorbeeld in de projectinstellingen van Vercel.

Alleen links die met `https://` beginnen worden gebruikt.

## Structuur

- `src/App.tsx` bevat de volledige interface.
- `src/instructions.ts` bevat alle stappen en de regels om de volgende te kiezen.
- `src/audio.ts` genereert het achtergrondgeluid met de Web Audio API.
- `src/i18n.ts` bevat de teksten van de interface en de taalkeuze.
- `src/theme.ts` kiest tussen licht en donker; de kleuren staan in `src/index.css`.
