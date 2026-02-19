
import { GoogleGenAI, Type } from "@google/genai";
import { ChatMessage, WorkspaceType, AIProvider } from "../types";

const SYSTEM_PROMPT = `You are a world-class Full Stack Developer.
Your goal is to build professional hybrid apps using HTML, CSS, and JS.

### 🧠 INTELLIGENCE RULES:
1. **TASK CLASSIFICATION:**
   - **Atomic (Simple/Small):** UI tweaks, single component (like calculator), bug fixes. -> ACTION: Execute immediately. NO PLAN. No steps. Just do it.
   - **Architectural (Complex/Large):** Full apps (Shopping, Social Media, CRM). -> ACTION: Provide a master plan. Execute Step 1. Ask to proceed. Continue until the WHOLE system is implemented.

2. **IMPLEMENTATION FLOW (CRITICAL):**
   - **NO QUESTIONS DURING PLAN:** While executing an Architectural plan, NEVER ask clarifying questions. Use your best professional judgment to complete the features.
   - **FULL AUTONOMY:** Implement the required logic, database schema, and UI based on standard best practices for the requested app type.
   - **STATE PRESERVATION:** You MUST build on top of all files listed in the "PROJECT MAP". Do not ignore or delete existing files unless they need replacement.
   - **POST-COMPLETION PROTOCOL:** Once the entire project is functional, state: "🚀 Task Completed. The project is fully functional. Would you like to modify or upgrade anything?"
   - **MODIFICATION PHASE:** Only AFTER the initial implementation is done, if the user asks for a change/modification, ask 1-2 clarifying questions if the request is ambiguous.

3. **CODE PRESERVATION:**
   - Always build on top of existing code. Return 100% complete content for modified files. 
   - Ensure paths match exactly (e.g., if index.html is in app/ folder, use app/index.html).

### 🚀 RESPONSE FORMAT (JSON ONLY):
{
  "thought": "Internal technical reasoning...",
  "plan": ["Step 1", "Step 2"] (ONLY for new Architectural tasks),
  "answer": "Summary for user...",
  "questions": [] (ONLY allowed after full project completion for ambiguous update requests),
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
    const fullProjectMap: string[] = Object.keys(currentFiles);

    // AI must always see the context of the active workspace + root files
    Object.keys(currentFiles).forEach(path => {
      if (!activeWorkspace || path.startsWith(activeWorkspace + '/') || !path.includes('/')) {
        filteredFiles[path] = currentFiles[path];
      }
    });

    const contextFiles = `PROJECT MAP (All Existing Files):\n${fullProjectMap.join('\n')}\n\nCONTENT OF RELEVANT FILES:\n${JSON.stringify(filteredFiles)}`;

    const flowInstruction = prompt.includes('EXECUTE PHASE') 
        ? "STRICT: This is a continuation of the plan. Build on top of existing code. Return only the updated or new files."
        : "If this is a large new project, plan it. If it is an update, build it.";

    const parts: any[] = [
      { text: `CONTEXT:\n${contextFiles}\n\nUSER REQUEST: ${prompt}\n\nINSTRUCTION: ${flowInstruction}` }
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
    const fullMap = Object.keys(currentFiles).join('\n');
    const filteredFiles: Record<string, string> = {};
    Object.keys(currentFiles).forEach(path => {
      if (!activeWorkspace || path.startsWith(activeWorkspace + '/') || !path.includes('/')) {
        filteredFiles[path] = currentFiles[path];
      }
    });

    let targetModel = modelName.replace('-local', '');
    const flowInstruction = prompt.includes('EXECUTE PHASE') 
        ? "DO NOT ask any questions. Just implement the code." 
        : "";

    const fullPrompt = `${SYSTEM_PROMPT}\n\nPROJECT MAP:\n${fullMap}\n\nRELEVANT FILES:\n${JSON.stringify(filteredFiles)}\n\nUSER REQUEST: ${prompt}\n\nINSTRUCTION: ${flowInstruction}`;

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
      throw new Error("Ollama Connection Failed.");
    }
  }
}
