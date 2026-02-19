
import { GoogleGenAI, Type } from "@google/genai";
import { ChatMessage, WorkspaceType, AIProvider } from "../types";

const SYSTEM_PROMPT = `You are a world-class Full Stack Developer.
Your goal is to build professional hybrid apps using HTML, CSS, and JS.

### 🧠 INTELLIGENCE RULES:
1. **TASK CLASSIFICATION:**
   - **Atomic (Simple/Small):** UI tweaks, single component (like calculator), bug fixes. -> ACTION: Execute immediately. NO PLAN. No steps. Just do it.
   - **Architectural (Complex/Large):** Full apps (Shopping, Social Media, CRM). -> ACTION: Provide a master plan. Execute Step 1. Ask to proceed. Continue until the WHOLE system is implemented.

2. **COMPLETION SIGNAL:**
   - When a task or a plan is finished, state: "🚀 Task Completed. The project is fully functional. Would you like to modify or upgrade anything? I am ready for your next directive."

3. **MODIFICATION PROTOCOL:**
   - For any requests AFTER the initial implementation, do NOT auto-code. 
   - First, ask 1-2 clarifying questions to understand exact requirements.
   - Once the user answers, apply the changes.

4. **CODE PRESERVATION:**
   - Build on top of "CURRENT FILES". Do not remove existing logic unless requested.

### 🚀 RESPONSE FORMAT (JSON ONLY):
{
  "thought": "Internal technical reasoning...",
  "plan": ["Step 1", "Step 2"] (ONLY for Architectural tasks),
  "answer": "Clear summary for user...",
  "questions": [{"id": "q1", "text": "...", "type": "single", "options": [...]}] (Use for modifications),
  "files": { "path/to/file.js": "..." }
}

Use modern Tailwind CSS and clean JS.`;

export interface GenerationResult {
  files?: Record<string, string>;
  answer: string;
  thought?: string;
  plan?: string[];
  questions?: any[];
}

export class GeminiService {
  async generateWebsite(
    prompt: string, 
    currentFiles: Record<string, string> = {}, 
    history: ChatMessage[] = [],
    image?: { data: string; mimeType: string },
    projectConfig?: any,
    activeWorkspace?: WorkspaceType,
    modelName: string = 'gemini-3-flash-preview'
  ): Promise<GenerationResult> {
    
    const isLocal = modelName.includes('local') || 
                    modelName.includes('ollama') || 
                    modelName.includes('qwen') || 
                    (modelName.includes(':') && !modelName.startsWith('gemini'));

    if (isLocal) {
      return this.generateWithOllama(prompt, currentFiles, history, image, activeWorkspace, modelName);
    }

    const key = process.env.API_KEY;
    if (!key || key === "undefined") {
      throw new Error("Cloud AI Error: API_KEY not found. Please use a local model or set the API_KEY.");
    }

    const ai = new GoogleGenAI({ apiKey: key });
    
    const filteredFiles: Record<string, string> = {};
    const fileTree: string[] = [];

    Object.keys(currentFiles).forEach(path => {
      fileTree.push(path);
      if (!activeWorkspace || path.startsWith(activeWorkspace + '/') || !path.includes('/')) {
        filteredFiles[path] = currentFiles[path];
      }
    });

    const contextFiles = `PROJECT MAP:\n${fileTree.join('\n')}\n\nFILE CONTENT:\n${JSON.stringify(filteredFiles)}`;

    const parts: any[] = [
      { text: `CONTEXT:\n${contextFiles}\n\nUSER REQUEST: ${prompt}\n\nINSTRUCTION: If this is an update/mod, ask questions first. If it is a new large app, plan then code.` }
    ];

    if (image) parts.push({ inlineData: { data: image.data, mimeType: image.mimeType } });

    try {
      const response = await ai.models.generateContent({
        model: modelName.includes('pro') ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview', 
        contents: { parts },
        config: { 
            systemInstruction: SYSTEM_PROMPT, 
            responseMimeType: "application/json",
            temperature: 0.1 
        }
      });
      
      const text = response.text || '{}';
      return JSON.parse(text);
    } catch (error: any) {
      console.error("AI Error:", error);
      throw new Error(error.message || "Failed to sync with AI engine.");
    }
  }

  private async generateWithOllama(
    prompt: string, 
    currentFiles: Record<string, string>, 
    history: ChatMessage[],
    image?: { data: string; mimeType: string },
    activeWorkspace?: WorkspaceType,
    modelName: string = 'llama3'
  ): Promise<GenerationResult> {
    const fileTree = Object.keys(currentFiles).join('\n');
    const filteredFiles: Record<string, string> = {};
    Object.keys(currentFiles).forEach(path => {
      if (!activeWorkspace || path.startsWith(activeWorkspace + '/') || !path.includes('/')) {
        filteredFiles[path] = currentFiles[path];
      }
    });

    let targetModel = modelName.replace('-local', '');
    const fullPrompt = `${SYSTEM_PROMPT}\n\nCONTEXT:\n${fileTree}\n\nFILES:\n${JSON.stringify(filteredFiles)}\n\nUSER REQUEST: ${prompt}`;

    try {
      const response = await fetch('http://127.0.0.1:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: targetModel,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history.map(h => ({ role: h.role, content: h.content })),
            { role: 'user', content: fullPrompt }
          ],
          stream: false,
          format: 'json'
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama Error: ${response.status}`);
      }
      
      const data = await response.json();
      const content = data.message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch (error: any) {
      throw new Error("Ollama Connection Failed. Ensure OLLAMA_ORIGINS=\"*\" and Browser Insecure Content is Allowed.");
    }
  }
}
