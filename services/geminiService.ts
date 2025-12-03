import { GoogleGenAI, Type } from "@google/genai";

const getClient = (userApiKey?: string) => {
  // Prioritize user-provided key, fallback to env var
  const apiKey = userApiKey || process.env.API_KEY;
  
  if (!apiKey) {
    console.warn("No API Key provided for Gemini Service");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const breakDownTask = async (bigGoal: string, userApiKey?: string): Promise<string[]> => {
  const ai = getClient(userApiKey);
  if (!ai) return [];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Break down the following goal into 3-5 smaller, actionable tasks suitable for 25-minute Pomodoro sessions: "${bigGoal}". Keep titles concise.`,
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