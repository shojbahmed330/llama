
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
  private isLocalModel(modelName: string): boolean {
    const name = modelName.toLowerCase();
    return name.includes('local') || name.includes('llama') || name.includes('qwen') || name.includes('coder');
  }

  async generateWebsite(
    prompt: string, 
    currentFiles: Record<string, string> = {}, 
    history: ChatMessage[] = [],
    image?: { data: string; mimeType: string },
    activeWorkspace?: WorkspaceType | boolean,
    modelName: string = 'gemini-3-flash-preview'
  ): Promise<GenerationResult> {
    
    const contextText = this.buildContextString(prompt, currentFiles, activeWorkspace);

    if (this.isLocalModel(modelName)) {
      return this.generateWithOllama(modelName, contextText, history);
    }

    const key = process.env.API_KEY;
    if (!key || key === "undefined") throw new Error("API_KEY not found.");

    const ai = new GoogleGenAI({ apiKey: key });
    const parts: any[] = [{ text: contextText }];
    if (image) parts.push({ inlineData: { data: image.data, mimeType: image.mimeType } });

    const response = await ai.models.generateContent({
      model: modelName.includes('pro') ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview', 
      contents: { parts },
      config: { systemInstruction: SYSTEM_PROMPT, responseMimeType: "application/json", temperature: 0.1 }
    });

    if (!response.text) throw new Error("AI returned empty response");
    return JSON.parse(response.text.trim());
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
    
    const contextText = this.buildContextString(prompt, currentFiles, activeWorkspace);

    if (this.isLocalModel(modelName)) {
      yield* this.streamWithOllama(modelName, contextText, history);
      return;
    }

    const key = process.env.API_KEY;
    if (!key || key === "undefined") throw new Error("API_KEY not found.");

    const ai = new GoogleGenAI({ apiKey: key });
    const parts: any[] = [{ text: contextText }];
    if (image) parts.push({ inlineData: { data: image.data, mimeType: image.mimeType } });

    const responseStream = await ai.models.generateContentStream({
      model: modelName.includes('pro') ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview', 
      contents: { parts },
      config: { systemInstruction: SYSTEM_PROMPT, responseMimeType: "application/json", temperature: 0.1 }
    });

    for await (const chunk of responseStream) {
      if (chunk.text) yield chunk.text;
    }
  }

  private buildContextString(prompt: string, currentFiles: Record<string, string>, activeWorkspace?: WorkspaceType | boolean): string {
    const filteredFiles: Record<string, string> = {};
    const fullProjectMap: string[] = Object.keys(currentFiles);

    Object.keys(currentFiles).forEach(path => {
      if (activeWorkspace === false) {
        filteredFiles[path] = currentFiles[path];
        return;
      }
      if (!activeWorkspace || path.startsWith(activeWorkspace + '/') || !path.includes('/')) {
        filteredFiles[path] = currentFiles[path];
      }
    });

    const flowInstruction = prompt.includes('EXECUTE PHASE') 
        ? "STRICT: Continuation phase. Return updated files."
        : "Plan or build based on request.";

    return `PROJECT MAP:\n${fullProjectMap.join('\n')}\n\nCONTENT:\n${JSON.stringify(filteredFiles)}\n\nUSER REQUEST: ${prompt}\n\nINSTRUCTION: ${flowInstruction}`;
  }

  private async generateWithOllama(model: string, prompt: string, history: ChatMessage[]): Promise<GenerationResult> {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...history.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: prompt }
        ],
        stream: false,
        format: 'json'
      })
    });
    if (!response.ok) throw new Error("Ollama connection failed. Ensure server is running with OLLAMA_ORIGINS=*");
    const data = await response.json();
    return JSON.parse(data.message.content);
  }

  private async *streamWithOllama(model: string, prompt: string, history: ChatMessage[]): AsyncIterable<string> {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...history.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: prompt }
        ],
        stream: true,
        format: 'json'
      })
    });

    if (!response.ok) throw new Error("Ollama connection failed. Check your local server.");
    
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            try {
              const json = JSON.parse(line);
              if (json.message?.content) yield json.message.content;
            } catch (e) {}
          }
        }
      }
    }
  }
}
