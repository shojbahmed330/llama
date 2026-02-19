
import { GoogleGenAI, Type } from "@google/genai";
import { ChatMessage, WorkspaceType, AIProvider } from "../types";

const SYSTEM_PROMPT = `You are a world-class Full Stack Developer.
Your goal is to build professional hybrid apps using HTML, CSS, and JS.

### 🧠 INTELLIGENCE RULES:
1. **TASK CLASSIFICATION:**
   - **Atomic (Simple/Small):** UI tweaks, single component, bug fixes. -> Execute immediately.
   - **Architectural (Complex/Large):** Full apps. -> Provide master plan.

2. **IMPLEMENTATION FLOW:**
   - Always build on top of all files listed in the "PROJECT MAP".
   - Return 100% complete content for modified files.

### 🚀 RESPONSE FORMAT (JSON ONLY):
{
  "thought": "Internal technical reasoning...",
  "plan": ["Step 1", "Step 2"],
  "answer": "Summary for user...",
  "files": { "path/to/file.js": "..." }
}

Use modern Tailwind CSS and clean JS. Ensure you return ONLY valid JSON.`;

export interface GenerationResult {
  files?: Record<string, string>;
  answer: string;
  thought?: string;
  plan?: string[];
  questions?: any[];
}

export class GeminiService {
  // Fix: Added missing generateWebsite method for non-streaming generation tasks like self-healing
  async generateWebsite(
    prompt: string, 
    currentFiles: Record<string, string> = {}, 
    history: ChatMessage[] = [],
    image?: { data: string; mimeType: string },
    activeWorkspace?: WorkspaceType | boolean,
    modelName: string = 'gemini-3-flash-preview'
  ): Promise<GenerationResult> {
    const key = process.env.API_KEY;
    if (!key || key === "undefined") throw new Error("API_KEY not found.");

    const ai = new GoogleGenAI({ apiKey: key });
    
    const filteredFiles: Record<string, string> = {};
    const fullProjectMap: string[] = Object.keys(currentFiles);

    Object.keys(currentFiles).forEach(path => {
      // If activeWorkspace is boolean false, skip filtering (used in self-healing)
      if (activeWorkspace === false) {
        filteredFiles[path] = currentFiles[path];
        return;
      }
      if (!activeWorkspace || path.startsWith(activeWorkspace + '/') || !path.includes('/')) {
        filteredFiles[path] = currentFiles[path];
      }
    });

    const contextFiles = `PROJECT MAP:\n${fullProjectMap.join('\n')}\n\nCONTENT:\n${JSON.stringify(filteredFiles)}`;

    const parts: any[] = [
      { text: `CONTEXT:\n${contextFiles}\n\nUSER REQUEST: ${prompt}` }
    ];

    if (image) parts.push({ inlineData: { data: image.data, mimeType: image.mimeType } });

    const response = await ai.models.generateContent({
      model: modelName.includes('pro') ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview', 
      contents: { parts },
      config: { 
          systemInstruction: SYSTEM_PROMPT, 
          responseMimeType: "application/json",
          temperature: 0.1 
      }
    });

    if (!response.text) throw new Error("AI returned empty response");
    
    try {
      return JSON.parse(response.text.trim());
    } catch (e) {
      console.error("JSON Parse Error:", response.text);
      throw new Error("Failed to parse AI response as valid JSON.");
    }
  }

  async *generateWebsiteStream(
    prompt: string, 
    currentFiles: Record<string, string> = {}, 
    history: ChatMessage[] = [],
    image?: { data: string; mimeType: string },
    projectConfig?: any,
    activeWorkspace?: WorkspaceType,
    modelName: string = 'gemini-3-flash-preview'
  ): AsyncIterable<string> {
    
    const key = process.env.API_KEY;
    if (!key || key === "undefined") throw new Error("API_KEY not found.");

    const ai = new GoogleGenAI({ apiKey: key });
    
    const filteredFiles: Record<string, string> = {};
    const fullProjectMap: string[] = Object.keys(currentFiles);

    Object.keys(currentFiles).forEach(path => {
      if (!activeWorkspace || path.startsWith(activeWorkspace + '/') || !path.includes('/')) {
        filteredFiles[path] = currentFiles[path];
      }
    });

    const contextFiles = `PROJECT MAP:\n${fullProjectMap.join('\n')}\n\nCONTENT:\n${JSON.stringify(filteredFiles)}`;
    const flowInstruction = prompt.includes('EXECUTE PHASE') 
        ? "STRICT: Continuation phase. Return updated files."
        : "Plan or build based on request.";

    const parts: any[] = [
      { text: `CONTEXT:\n${contextFiles}\n\nUSER REQUEST: ${prompt}\n\nINSTRUCTION: ${flowInstruction}` }
    ];

    if (image) parts.push({ inlineData: { data: image.data, mimeType: image.mimeType } });

    const responseStream = await ai.models.generateContentStream({
      model: modelName.includes('pro') ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview', 
      contents: { parts },
      config: { 
          systemInstruction: SYSTEM_PROMPT, 
          responseMimeType: "application/json",
          temperature: 0.1 
      }
    });

    for await (const chunk of responseStream) {
      if (chunk.text) yield chunk.text;
    }
  }
}
