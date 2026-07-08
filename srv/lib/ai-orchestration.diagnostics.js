import { askAssistant } from './ai-orchestration.js';

function hasValue(value) {
  return Boolean(value && String(value).trim());
}

function getEnvStatus() {
  return {
    AICORE_SERVICE_KEY: hasValue(process.env.AICORE_SERVICE_KEY)
      ? `present (${process.env.AICORE_SERVICE_KEY.length} characters)`
      : 'missing',
    AI_RESOURCE_GROUP: process.env.AI_RESOURCE_GROUP || 'missing',
    AI_RESOURCE_GROUP_ID: process.env.AI_RESOURCE_GROUP_ID || 'missing',
    AI_ORCHESTRATION_DEPLOYMENT_ID: process.env.AI_ORCHESTRATION_DEPLOYMENT_ID || 'missing',
    AI_ORCHESTRATION_CONFIG_ID: process.env.AI_ORCHESTRATION_CONFIG_ID || 'missing',
    AI_ORCHESTRATION_CONFIG_SCENARIO: process.env.AI_ORCHESTRATION_CONFIG_SCENARIO || 'missing',
    AI_ORCHESTRATION_CONFIG_NAME: process.env.AI_ORCHESTRATION_CONFIG_NAME || 'missing',
    AI_ORCHESTRATION_CONFIG_VERSION: process.env.AI_ORCHESTRATION_CONFIG_VERSION || 'missing',
    AI_MODEL_NAME: process.env.AI_MODEL_NAME || 'default from code'
  };
}

function getErrorDetails(error) {
  return {
    name: error?.name,
    message: error?.message,
    code: error?.code,
    status: error?.status,
    statusCode: error?.statusCode,
    responseStatus: error?.response?.status,
    responseStatusText: error?.response?.statusText,
    responseData: error?.response?.data,
    cause: error?.cause ? getErrorDetails(error.cause) : undefined
  };
}

console.log('AI orchestration environment status:', getEnvStatus());

try {
  const result = await askAssistant({
    prompt: 'Reply with one short sentence: AI orchestration is reachable.'
  });

  console.log('AI orchestration response:', result);
} catch (error) {
  console.error(
    'AI orchestration diagnostics failed:',
    JSON.stringify(getErrorDetails(error), null, 2)
  );
  process.exitCode = 1;
}
