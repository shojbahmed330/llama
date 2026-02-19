
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
    
    // Comprehensive check for local models based on name patterns
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

    // Handle name cleanup for Ollama request
    let targetModel = modelName.replace('-local', '');
    
    const fullPrompt = `${SYSTEM_PROMPT}\n\nCONTEXT:\n${fileTree}\n\nRELEVANT FILES:\n${JSON.stringify(filteredFiles)}\n\nUSER REQUEST: ${prompt}`;

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

      if (response.status === 404) {
        throw new Error(`মডেল "${targetModel}" ওলামাতে পাওয়া যায়নি। আপনার পিসিতে ওলামা চালু করে মডেলটি সচল করুন।`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama Error ${response.status}: ${errorText || 'OLLAMA_ORIGINS="*" সেট করা আছে কিনা চেক করুন।'}`);
      }
      
      const data = await response.json();
      const content = data.message.content;
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const cleanContent = jsonMatch ? jsonMatch[0] : content;
      
      return JSON.parse(cleanContent);
    } catch (error: any) {
      console.error("Ollama Diagnostic:", error);
      
      if (error.message.includes('fetch') || error.name === 'TypeError') {
        throw new Error("ব্রাউজার কানেকশন ব্লক করছে। ব্রাউজার বারে 🔒 আইকন থেকে 'Insecure Content' Allow করুন।");
      }
      
      throw error;
    }
  }
}
