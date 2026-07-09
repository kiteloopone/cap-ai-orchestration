import {
  OrchestrationClient,
  buildAzureContentSafetyFilter
} from '@sap-ai-sdk/orchestration';

const DEFAULT_MODEL = process.env.AI_MODEL_NAME || 'gemini-2.5-flash-lite';
const RESOURCE_GROUP = process.env.AI_RESOURCE_GROUP || process.env.AI_RESOURCE_GROUP_ID;
const DEPLOYMENT_ID = process.env.AI_ORCHESTRATION_DEPLOYMENT_ID;
const CONFIG_ID = process.env.AI_ORCHESTRATION_CONFIG_ID;
const CONFIG_SCENARIO = process.env.AI_ORCHESTRATION_CONFIG_SCENARIO;
const CONFIG_NAME = process.env.AI_ORCHESTRATION_CONFIG_NAME;
const CONFIG_VERSION = process.env.AI_ORCHESTRATION_CONFIG_VERSION;

function getDeploymentConfig() {
  if (DEPLOYMENT_ID) {
    return { deploymentId: DEPLOYMENT_ID };
  }

  if (RESOURCE_GROUP) {
    return { resourceGroup: RESOURCE_GROUP };
  }
}

function getOrchestrationConfig(inlineConfig) {
  if (CONFIG_ID) {
    return { id: CONFIG_ID };
  }

  if (CONFIG_SCENARIO && CONFIG_NAME && CONFIG_VERSION) {
    return {
      scenario: CONFIG_SCENARIO,
      name: CONFIG_NAME,
      version: CONFIG_VERSION
    };
  }

  return inlineConfig;
}

function toPdfDataUrl(contentBase64) {
  const trimmed = contentBase64.trim();
  return trimmed.startsWith('data:')
    ? trimmed
    : `data:application/pdf;base64,${trimmed}`;
}

function createClient({
  systemInstruction = 'You are an SAP CAP application assistant. Answer precisely and clearly. If business context is provided in the user query, use it. If the context is insufficient, say what is missing.',
  userTemplate = '{{?user_query}}',
  maxTokens = 700
} = {}) {
  const inlineConfig = {
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
  };

  return new OrchestrationClient(
    getOrchestrationConfig(inlineConfig),
    getDeploymentConfig()
  );
}

export async function askWithBusinessContext({ businessContext, question }) {
  if (!question || !question.trim()) {
    throw new Error('Question must not be empty.');
  }

  const client = createClient();
  const userQuery = `Business object context:
${businessContext}

User question:
${question}`;

  const response = await client.chatCompletion({
    placeholderValues: {
      user_query: userQuery
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
    userTemplate: '{{?user_query}}'
  });

  const response = await client.chatCompletion({
    placeholderValues: {
      user_query: prompt
    }
  });

  return {
    content: response.getContent(),
    finishReason: response.getFinishReason(),
    tokenUsage: response.getTokenUsage()
  };
}

export async function analyzePdfDocument({
  fileName,
  contentBase64,
  userQuery = `Read the attached PDF document and extract invoice information.
Return only valid JSON without Markdown fences.
Use null for unknown values and ISO date format YYYY-MM-DD for dates.
Fields: documentType, supplierName, invoiceNumber, invoiceDate, dueDate, netAmount, taxAmount, totalAmount, currency, paymentReference, summary, missingInformation.`
}) {
  if (!contentBase64 || !contentBase64.trim()) {
    throw new Error('PDF content must not be empty.');
  }

  const client = createClient({
    systemInstruction:
      'You are a document extraction assistant. Extract facts from the attached PDF. Do not guess. If a field is missing or unclear, return null or mention it in missingInformation.',
    userTemplate: '{{?user_query}}',
    maxTokens: 1200
  });

  const response = await client.chatCompletion({
    placeholderValues: {
      user_query: userQuery
    },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'file',
            file: {
              file_data: toPdfDataUrl(contentBase64),
              filename: fileName || 'document.pdf'
            }
          }
        ]
      }
    ]
  });

  return {
    content: response.getContent(),
    finishReason: response.getFinishReason(),
    tokenUsage: response.getTokenUsage()
  };
}
