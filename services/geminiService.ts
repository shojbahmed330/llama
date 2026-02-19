
import { GoogleGenAI, Type } from "@google/genai";
import { ChatMessage, WorkspaceType, AIProvider } from "../types";

const SYSTEM_PROMPT = `You are a world-class Full Stack Developer.
Your goal is to build professional hybrid apps using HTML, CSS, and JS.

### 🚀 TOKEN OPTIMIZATION RULES:
1. **DELTA UPDATES ONLY:** Return ONLY the files that need to be created or modified. Do NOT return files that haven't changed.
2. **CONTEXT AWARENESS:** Use the provided "Project Map" to understand the structure.
3. **COMPLETENESS:** For any file you choose to return, provide the 100% complete content. No placeholders.

### 📜 CORE RULES:
1. **CODE PRESERVATION:** Build on top of "CURRENT FILES". Do not remove existing logic.
2. **RESPONSE FORMAT:** Return a JSON object:
{
  "thought": "Technical analysis...",
  "plan": ["Step 1...", "Step 2..."],
  "answer": "Summary for user...",
  "files": {
    "path/to/changed_file.js": "..." 
  }
}

Use modern Tailwind CSS and clean JS.`;

export interface GenerationResult {
  files?: Record<string, string>;
  answer: string;
  thought?: string;
  plan?: string[];
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
    
    // 1. Route to local model if selected
    const isLocal = modelName.includes('local') || modelName.includes('ollama') || modelName.includes('qwen');
    if (isLocal) {
      return this.generateWithOllama(prompt, currentFiles, history, image, activeWorkspace, modelName);
    }

    // 2. Only check for API_KEY if using Cloud Gemini models
    const key = process.env.API_KEY;
    if (!key || key === "undefined") {
      throw new Error("Cloud AI Error: API_KEY not found in Vercel environment. Please use a local model or set the API_KEY.");
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

    const contextFiles = `PROJECT MAP (Structure):\n${fileTree.join('\n')}
    
    RELEVANT FILE CONTENT (Current Workspace: ${activeWorkspace || 'All'}):\n${JSON.stringify(filteredFiles, null, 2)}`;

    const parts: any[] = [
      { text: `CONTEXT:\n${contextFiles}\n\nUSER REQUEST: ${prompt}\n\nIMPORTANT: Only return files that need updates.` }
    ];

    if (image) parts.push({ inlineData: { data: image.data, mimeType: image.mimeType } });

    try {
      const response = await ai.models.generateContent({
        model: modelName.includes('pro') ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview', 
        contents: { parts },
        config: { 
            systemInstruction: SYSTEM_PROMPT, 
            responseMimeType: "application/json",
            temperature: 0.2 
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

    // Clean model name for Ollama
    const targetModel = modelName.replace('-local', '');

    const fullPrompt = `
    ${SYSTEM_PROMPT}

    CONTEXT:
    PROJECT MAP:
    ${fileTree}

    RELEVANT FILES:
    ${JSON.stringify(filteredFiles)}

    USER REQUEST:
    ${prompt}

    RESPONSE (JSON ONLY):`;

    try {
      const response = await fetch('http://localhost:11434/api/chat', {
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

      if (!response.ok) throw new Error(`Ollama connection failed (HTTP ${response.status}). Ensure Ollama is running at :11434 and OLLAMA_ORIGINS="*" is set.`);
      
      const data = await response.json();
      const content = data.message.content;
      
      // Attempt to clean JSON if model returns extra text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const cleanContent = jsonMatch ? jsonMatch[0] : content;
      
      return JSON.parse(cleanContent);
    } catch (error: any) {
      console.error("Ollama Error:", error);
      throw new Error(`Local Model Error: ${error.message}. Make sure Ollama is serve-ing with proper CORS settings.`);
    }
  }
}
