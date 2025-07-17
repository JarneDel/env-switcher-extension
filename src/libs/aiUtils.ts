/**
 * LM Studio AI integration for intelligent environment naming
 */

export interface LMStudioConfig {
  enabled: boolean;
  url: string;
  model: string;
}

export interface LMStudioModel {
  id: string;
  name: string;
  description?: string;
}

/**
 * Get available models from LM Studio
 */
export const getAvailableModels = async (lmStudioUrl: string): Promise<LMStudioModel[]> => {
  try {
    const response = await fetch(`${lmStudioUrl}/v1/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data?.map((model: any) => ({
      id: model.id,
      name: model.id,
      description: model.description || '',
    })) || [];
  } catch (error) {
    console.error('Failed to fetch LM Studio models:', error);
    throw new Error('Failed to connect to LM Studio. Please check the URL and ensure LM Studio is running.');
  }
};

/**
 * Generate an environment name using LM Studio AI
 */
export const generateEnvironmentName = async (
  url: string,
  lmStudioConfig: LMStudioConfig
): Promise<string> => {
  if (!lmStudioConfig.enabled || !lmStudioConfig.url || !lmStudioConfig.model) {
    throw new Error('LM Studio configuration is incomplete');
  }

  const prompt = `Based on the following URL, suggest a concise, descriptive environment name (2-3 words max) that would be suitable for a development environment switcher.

URL: ${url}

Rules:
- Return ONLY the environment name, nothing else
- No quotes, no explanations, no punctuation
- Use title case (e.g., "Local Dev", "API Server", "Admin Panel")
- Be descriptive but concise
- Focus on the environment type/purpose, NOT the project or company name
- Describe what kind of environment this is (e.g., "Production", "Staging", "Development", "API", "Admin", "Dashboard")
- Examples: "Local Dev" for localhost, "Production" for main sites, "API Server" for api endpoints, "Admin Panel" for admin interfaces

Environment name:`;

  try {
    const response = await fetch(`${lmStudioConfig.url}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: lmStudioConfig.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 20,
        temperature: 0.3,
        stop: ['\n', '.', '!', '?']
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const generatedName = data.choices?.[0]?.message?.content?.trim();

    if (!generatedName) {
      throw new Error('No response generated from LM Studio');
    }

    // Clean up the response - remove quotes and extra whitespace
    return generatedName.replace(/['"]/g, '').trim();
  } catch (error) {
    console.error('Failed to generate environment name:', error);
    throw new Error('Failed to generate environment name with AI');
  }
};

/**
 * Test LM Studio connection
 */
export const testLMStudioConnection = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(`${url}/v1/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};
