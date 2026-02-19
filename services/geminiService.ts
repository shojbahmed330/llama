
import { GoogleGenAI, Type } from "@google/genai";
import { ChatMessage, WorkspaceType, AIProvider } from "../types";

const SYSTEM_PROMPT = `You are a world-class Full Stack Developer and Architect.
Your goal is to build professional hybrid apps using HTML, CSS, and JS.

### 🧠 INTELLIGENCE RULES:
1. **CLARIFICATION FIRST:** 
   - If a user request is vague, DO NOT implement immediately. Generate a "questions" array.
   - **ADMIN PANEL LOGIC:** DO NOT create an Admin Panel by default. Only generate files in the "admin/" directory if:
     a) The user explicitly asks for it.
     b) The app is complex (e.g., requires database management, user moderation, or analytics).
     c) If unsure, ask the user: "Do you need an admin management panel for this app?"

2. **TASK FLOW:**
   - Once requirements are clear:
   - Step A: Provide a detailed "plan".
   - Step B: Perform a 100% complete implementation of necessary files.
   - Use "app/" for the main mobile interface and "admin/" for management (if required).

3. **RESUME & EDIT LOGIC:**
   - Always build on top of existing code in "PROJECT MAP".
   - Maintain consistency across workspaces.

### 🚀 RESPONSE FORMAT (JSON ONLY):
{
  "thought": "Internal reasoning...",
  "questions": [],
  "plan": [],
  "answer": "Summary of actions...",
  "files": { "app/index.html": "...", "admin/index.html": "..." }
}

### 🎨 DESIGN RULES:
- Use Tailwind CSS.
- Ensure high-end UI/UX. No placeholders.`;

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
    modelName: string = 'gemini-3-flash-preview',
    signal?: AbortSignal
  ): AsyncIterable<string> {
    
    if (signal?.aborted) throw new Error("AbortError");

    const contextText = this.buildContextString(prompt, currentFiles, activeWorkspace);

    if (this.isLocalModel(modelName)) {
      yield* this.streamWithOllama(modelName, contextText, history, signal);
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
      if (signal?.aborted) throw new Error("AbortError");
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

    return `PROJECT MAP (FILES IN WORKSPACE):\n${fullProjectMap.join('\n')}\n\nCURRENT SOURCE CONTENT:\n${JSON.stringify(filteredFiles)}\n\nUSER DIRECTIVE: ${prompt}\n\nINSTRUCTION: Admin panel is optional. Use "questions" to ask if one is needed for simple apps.`;
  }

  private async generateWithOllama(model: string, prompt: string, history: ChatMessage[], signal?: AbortSignal): Promise<GenerationResult> {
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
      }),
      signal
    });
    if (!response.ok) throw new Error("Ollama connection failed.");
    const data = await response.json();
    return JSON.parse(data.message.content);
  }

  private async *streamWithOllama(model: string, prompt: string, history: ChatMessage[], signal?: AbortSignal): AsyncIterable<string> {
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
      }),
      signal
    });

    if (!response.ok) throw new Error("Ollama connection failed.");
    
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (reader) {
      try {
        while (true) {
          if (signal?.aborted) {
             reader.cancel();
             throw new Error("AbortError");
          }
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
      } finally {
        reader.releaseLock();
      }
    }
  }
}
