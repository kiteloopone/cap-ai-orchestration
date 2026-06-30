import {
  OrchestrationClient,
  buildAzureContentSafetyFilter
} from '@sap-ai-sdk/orchestration';

const DEFAULT_MODEL = process.env.AI_MODEL_NAME || 'gpt-5';

function createClient({
  systemInstruction = 'You are an SAP CAP application assistant. Answer precisely, based only on the provided business object context. If the context is insufficient, say what is missing.',
  userTemplate = `
Business object context:
{{?businessContext}}

User question:
{{?question}}
`,
  maxTokens = 700
} = {}) {
  return new OrchestrationClient({
    promptTemplating: {
      model: {
        name: DEFAULT_MODEL,
        params: {
          max_tokens: maxTokens
        }
      },
      prompt: {
        template: [
          {
            role: 'system',
            content: systemInstruction
          },
          {
            role: 'user',
            content: userTemplate
          }
        ]
      }
    },
    filtering: {
      input: {
        filters: [
          buildAzureContentSafetyFilter('input', {
            hate: 'ALLOW_SAFE',
            violence: 'ALLOW_SAFE',
            sexual: 'ALLOW_SAFE',
            self_harm: 'ALLOW_SAFE'
          })
        ]
      },
      output: {
        filters: [
          buildAzureContentSafetyFilter('output', {
            hate: 'ALLOW_SAFE',
            violence: 'ALLOW_SAFE',
            sexual: 'ALLOW_SAFE',
            self_harm: 'ALLOW_SAFE'
          })
        ]
      }
    }
  });
}

export async function askWithBusinessContext({ businessContext, question }) {
  if (!question || !question.trim()) {
    throw new Error('Question must not be empty.');
  }

  const client = createClient();

  const response = await client.chatCompletion({
    placeholderValues: {
      businessContext,
      question
    }
  });

  return {
    content: response.getContent(),
    finishReason: response.getFinishReason(),
    tokenUsage: response.getTokenUsage()
  };
}

export async function askAssistant({ prompt }) {
  if (!prompt || !prompt.trim()) {
    throw new Error('Prompt must not be empty.');
  }

  const client = createClient({
    systemInstruction:
      'You are a helpful assistant embedded in an SAP CAP and SAP Fiori application. Answer clearly and practically. When the user asks about application data, mention that you need a concrete business object or context if none was provided.',
    userTemplate: '{{?prompt}}'
  });

  const response = await client.chatCompletion({
    placeholderValues: {
      prompt
    }
  });

  return {
    content: response.getContent(),
    finishReason: response.getFinishReason(),
    tokenUsage: response.getTokenUsage()
  };
}