import { GoogleGenAI, Type } from "@google/genai";

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_PROMPT = 'Break down the following goal into 3-5 smaller, actionable tasks suitable for 25-minute Pomodoro sessions: "{goal}". Keep titles concise.';

const getClient = (userApiKey?: string) => {
  // Prioritize user-provided key, fallback to env var
  const apiKey = userApiKey || process.env.API_KEY;
  
  if (!apiKey) {
    console.warn("No API Key provided for AI Service");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export interface AIModelConfig {
  modelId?: string;
  customPrompt?: string;
  provider?: 'gemini' | 'openai-compatible';
  apiBaseUrl?: string;
  supportsStructuredOutput?: boolean;
}

// Format instruction to append when model doesn't support structured output
const JSON_FORMAT_INSTRUCTION = '\n\nIMPORTANT: Respond ONLY with a valid JSON array of strings. Example format: ["Task 1", "Task 2", "Task 3"]. Do not include any other text, explanations, or markdown formatting.';

const callOpenAICompatible = async (
  prompt: string,
  apiKey: string,
  baseUrl: string,
  modelId: string,
  supportsStructuredOutput: boolean
): Promise<string[]> => {
  const url = baseUrl.endsWith('/') ? `${baseUrl}chat/completions` : `${baseUrl}/chat/completions`;
  
  const requestBody: any = {
    model: modelId,
    messages: [
      {
        role: "user",
        content: supportsStructuredOutput ? prompt : prompt + JSON_FORMAT_INSTRUCTION
      }
    ]
  };

  // Add structured output configuration if supported
  if (supportsStructuredOutput) {
    requestBody.response_format = {
      type: "json_schema",
      json_schema: {
        name: "task_breakdown",
        strict: true,
        schema: {
          type: "object",
          properties: {
            tasks: {
              type: "array",
              items: {
                type: "string"
              }
            }
          },
          required: ["tasks"],
          additionalProperties: false
        }
      }
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) return [];

  // Parse the response
  try {
    const parsed = JSON.parse(content);
    // Handle both formats: {tasks: [...]} and [...]
    if (Array.isArray(parsed)) {
      return parsed;
    } else if (parsed.tasks && Array.isArray(parsed.tasks)) {
      return parsed.tasks;
    }
    return [];
  } catch (e) {
    console.error("Failed to parse OpenAI response:", e);
    return [];
  }
};

export const breakDownTask = async (
  bigGoal: string, 
  userApiKey?: string, 
  modelConfig?: AIModelConfig
): Promise<string[]> => {
  const provider = modelConfig?.provider || 'gemini';
  const modelId = modelConfig?.modelId || DEFAULT_MODEL;
  const promptTemplate = modelConfig?.customPrompt || DEFAULT_PROMPT;
  const prompt = promptTemplate.replace('{goal}', bigGoal);
  const supportsStructuredOutput = modelConfig?.supportsStructuredOutput ?? true;

  try {
    if (provider === 'openai-compatible') {
      const apiKey = userApiKey || process.env.API_KEY;
      if (!apiKey) {
        console.warn("No API Key provided for OpenAI-compatible service");
        return [];
      }

      const baseUrl = modelConfig?.apiBaseUrl || 'https://api.openai.com/v1';
      return await callOpenAICompatible(prompt, apiKey, baseUrl, modelId, supportsStructuredOutput);
    } else {
      // Gemini provider
      const ai = getClient(userApiKey);
      if (!ai) return [];

      const config: any = {};
      
      if (supportsStructuredOutput) {
        config.responseMimeType = "application/json";
        config.responseSchema = {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        };
      }

      const response = await ai.models.generateContent({
        model: modelId,
        contents: supportsStructuredOutput ? prompt : prompt + JSON_FORMAT_INSTRUCTION,
        config: Object.keys(config).length > 0 ? config : undefined
      });

      const text = response.text;
      if (!text) return [];
      
      return JSON.parse(text) as string[];
    }
  } catch (error) {
    console.error("AI API Error:", error);
    // Return empty array on error so UI handles it gracefully
    return [];
  }
};