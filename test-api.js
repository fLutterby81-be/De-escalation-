fetch("http://localhost:3000/api/tts", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: "Test audio" })
}).then(r => r.json()).then(console.log).catch(console.error);
