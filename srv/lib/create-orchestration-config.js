import { ConfigurationApi, DeploymentApi } from '@sap-ai-sdk/ai-api';

const RESOURCE_GROUP = process.env.AI_RESOURCE_GROUP || process.env.AI_RESOURCE_GROUP_ID || 'YourResourceGroupId';
const CONFIGURATION_NAME = process.env.AI_ORCHESTRATION_CONFIG_NAME || 'orchestration-config';
const EXECUTABLE_ID = process.env.AI_ORCHESTRATION_EXECUTABLE_ID || 'orchestration';
const SCENARIO_ID = process.env.AI_ORCHESTRATION_SCENARIO_ID || 'orchestration';

async function createOrchestrationConfiguration() {
  if (!RESOURCE_GROUP || RESOURCE_GROUP === 'YourResourceGroupId') {
    throw new Error('Set AI_RESOURCE_GROUP (or AI_RESOURCE_GROUP_ID) in your environment before running this script.');
  }

  const response = await ConfigurationApi
    .configurationCreate({
      name: CONFIGURATION_NAME,
      executableId: EXECUTABLE_ID,
      scenarioId: SCENARIO_ID
    }, { 'AI-Resource-Group': RESOURCE_GROUP })
    .execute();

  return response;
}

async function createOrchestrationDeployment(configurationId) {
  const response = await DeploymentApi
    .deploymentCreate(
      { configurationId },
      { 'AI-Resource-Group': RESOURCE_GROUP }
    )
    .execute();

  return response;
}

async function main() {
  const configuration = await createOrchestrationConfiguration();
  console.log('Configuration created:', configuration?.message || configuration?.id);

  const deployment = await createOrchestrationDeployment(configuration?.id);
  console.log('Deployment created:', deployment?.message || deployment?.id);
}

try {
  await main();
} catch (error) {
  console.error('Orchestration setup failed:', error?.stack || error);
  process.exitCode = 1;
}