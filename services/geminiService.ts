import type { AIModelConfig } from '../types';

const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_PROMPT = 'Break down the following goal into 3-5 smaller, actionable tasks suitable for 25-minute Pomodoro sessions: "{goal}". Keep titles concise.';
const JSON_FORMAT_INSTRUCTION = '\n\nIMPORTANT: Respond ONLY with a valid JSON array of strings. Example format: ["Task 1", "Task 2", "Task 3"]. Do not include any other text, explanations, or markdown formatting.';

const readGeminiContent = (data: unknown): string => {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('candidates' in data) ||
    !Array.isArray(data.candidates)
  ) return '';

  const candidate: unknown = data.candidates[0];
  if (
    typeof candidate !== 'object' ||
    candidate === null ||
    !('content' in candidate) ||
    typeof candidate.content !== 'object' ||
    candidate.content === null ||
    !('parts' in candidate.content) ||
    !Array.isArray(candidate.content.parts)
  ) return '';

  return candidate.content.parts
    .map((part: unknown) => (
      typeof part === 'object' &&
      part !== null &&
      'text' in part &&
      typeof part.text === 'string'
        ? part.text
        : ''
    ))
    .join('')
    .trim();
};

const readOpenAIContent = (data: unknown): string => {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('choices' in data) ||
    !Array.isArray(data.choices)
  ) return '';

  const choice: unknown = data.choices[0];
  if (
    typeof choice !== 'object' ||
    choice === null ||
    !('message' in choice) ||
    typeof choice.message !== 'object' ||
    choice.message === null ||
    !('content' in choice.message) ||
    typeof choice.message.content !== 'string'
  ) return '';

  return choice.message.content;
};

const parseTasks = (content: string): string[] => {
  const parsed: unknown = JSON.parse(content);
  let tasks: unknown = null;

  if (Array.isArray(parsed)) {
    tasks = parsed;
  } else if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'tasks' in parsed
  ) {
    tasks = parsed.tasks;
  }

  if (!Array.isArray(tasks)) return [];
  return tasks
    .filter((task): task is string => typeof task === 'string')
    .map(task => task.trim())
    .filter(Boolean);
};

const callGemini = async (
  prompt: string,
  apiKey: string,
  modelId: string,
  supportsStructuredOutput: boolean
): Promise<string[]> => {
  const generationConfig = supportsStructuredOutput
    ? {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'ARRAY',
          items: { type: 'STRING' }
        }
      }
    : undefined;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: supportsStructuredOutput ? prompt : prompt + JSON_FORMAT_INSTRUCTION
          }]
        }],
        generationConfig
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
  }

  const data: unknown = await response.json();
  const content = readGeminiContent(data);

  return content ? parseTasks(content) : [];
};

const callOpenAICompatible = async (
  prompt: string,
  apiKey: string,
  baseUrl: string,
  modelId: string,
  supportsStructuredOutput: boolean
): Promise<string[]> => {
  const url = baseUrl.endsWith('/') ? `${baseUrl}chat/completions` : `${baseUrl}/chat/completions`;
  const requestBody: {
    model: string;
    messages: Array<{ role: 'user'; content: string }>;
    response_format?: {
      type: 'json_schema';
      json_schema: {
        name: string;
        strict: boolean;
        schema: Record<string, unknown>;
      };
    };
  } = {
    model: modelId,
    messages: [{
      role: 'user',
      content: supportsStructuredOutput ? prompt : prompt + JSON_FORMAT_INSTRUCTION
    }]
  };

  if (supportsStructuredOutput) {
    requestBody.response_format = {
      type: 'json_schema',
      json_schema: {
        name: 'task_breakdown',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            tasks: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['tasks'],
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

  const data: unknown = await response.json();
  const content = readOpenAIContent(data);
  return content ? parseTasks(content) : [];
};

export const breakDownTask = async (
  bigGoal: string,
  userApiKey?: string,
  modelConfig?: AIModelConfig
): Promise<string[]> => {
  const apiKey = userApiKey || process.env.API_KEY;
  if (!apiKey) {
    console.warn('No API Key provided for AI service');
    return [];
  }

  const provider = modelConfig?.provider || 'gemini';
  const modelId = modelConfig?.modelId || DEFAULT_MODEL;
  const promptTemplate = modelConfig?.customPrompt || DEFAULT_PROMPT;
  const prompt = promptTemplate.replace('{goal}', bigGoal);
  const supportsStructuredOutput = modelConfig?.supportsStructuredOutput ?? true;

  try {
    if (provider === 'openai-compatible') {
      const baseUrl = modelConfig?.apiBaseUrl || 'https://api.openai.com/v1';
      return await callOpenAICompatible(prompt, apiKey, baseUrl, modelId, supportsStructuredOutput);
    }

    return await callGemini(prompt, apiKey, modelId, supportsStructuredOutput);
  } catch (error) {
    console.error('AI API Error:', error);
    return [];
  }
};