import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const pager = await ai.models.list(); const names=[];
for await (const m of pager) if (/flash/.test(m.name)) names.push(m.name);
console.log(names.join("\n"));
for (const model of ["gemini-3.8-flash","gemini-3.5-flash-lite"]) {
 try { const r = await ai.models.generateContent({ model, contents: "Say ok" }); console.log(model,"OK", r.text.slice(0,20)); } catch(e){ console.log(model,"ERR",String(e.message).slice(0,160)); }
}
