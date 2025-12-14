import { GoogleGenAI, Type } from "@google/genai";

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_PROMPT = 'Break down the following goal into 3-5 smaller, actionable tasks suitable for 25-minute Pomodoro sessions: "{goal}". Keep titles concise.';

const getClient = (userApiKey?: string) => {
  // Prioritize user-provided key, fallback to env var
  const apiKey = userApiKey || process.env.API_KEY;
  
  if (!apiKey) {
    console.warn("No API Key provided for Gemini Service");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export interface AIModelConfig {
  modelId?: string;
  customPrompt?: string;
}

export const breakDownTask = async (
  bigGoal: string, 
  userApiKey?: string, 
  modelConfig?: AIModelConfig
): Promise<string[]> => {
  const ai = getClient(userApiKey);
  if (!ai) return [];

  const modelId = modelConfig?.modelId || DEFAULT_MODEL;
  const promptTemplate = modelConfig?.customPrompt || DEFAULT_PROMPT;
  const prompt = promptTemplate.replace('{goal}', bigGoal);

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Return empty array on error so UI handles it gracefully
    return [];
  }
};