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

  const prompt = `You get a URL. Return only a 1–3 word Title Case environment/type name. If the URL is clearly production (contains "prod", is the root/apex domain with no dev/staging/test/beta/internal indicators, or lacks any qualifier), output Production. Otherwise infer from subdomain/path: staging, dev, test, beta, api, admin, preview, internal, etc. Do not include project or company names, punctuation, quotes, or explanation.

Examples:
http://localhost:3000 -> Local Dev
https://staging.example.com -> Staging
https://api.example.com/v1 -> API Server
https://admin.example.com/dashboard -> Admin Panel
https://beta.example.com -> Preview
https://internal.example.com/tools -> Internal Tools
https://example.com -> Production
https://prod.example.com -> Production

URL: ${url}`


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
