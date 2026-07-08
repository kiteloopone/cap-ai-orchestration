# CAP AI Orchestration

This project is a small SAP CAP application with a SAP Fiori/UI5 frontend and SAP AI SDK Orchestration in the backend.

It provides product data from a local SQLite database and exposes AI actions through the `CatalogService`.

## What is included

- `CatalogService` with a `Products` entity.
- `Documents` entity for locally persisted PDF processing results.
- Demo product data in `db/data/demo.ai-Products.csv`.
- An `AI Prompt` UI for sending free text prompts to the AI assistant.
- A simple PDF upload and processing UI for testing document extraction.
- A Fiori launchpad sandbox at `app/fiori-apps.html`.
- Backend AI actions for product-related questions and summaries.

## AI actions

The service exposes these actions:

- `askAssistant`: sends a free text prompt to the AI assistant.
- `askAboutProduct`: asks a question about one product and adds product data as business context.
- `generateProductSummary`: creates a short AI summary for one product.
- `uploadDocument`: stores a PDF locally in SQLite for test processing.
- `processDocument`: sends the stored PDF to SAP AI Orchestration and stores the extracted response.

## Start the app

Install the dependencies:

```bash
npm install
```

Start the local CAP server:

```bash
npm run watch
```

Then open one of these URLs:

- Launchpad: `http://localhost:4004/fiori-apps.html`
- AI Prompt app: `http://localhost:4004/ai-prompt/webapp/index.html`
- OData service: `http://localhost:4004/odata/v4/catalog/`

## AI configuration

AI calls need valid SAP AI Core / SAP AI SDK Orchestration environment variables.

Use a local `.env` file or another environment setup that provides the required credentials. Start from `.env.example` and fill in your own SAP AI Core service key values.

The app does not call ChatGPT or Codex directly from the browser. The flow is:

1. The user enters a prompt in the UI and clicks `Send`.
2. The UI calls the CAP OData action `askAssistant`.
3. The CAP backend uses SAP AI SDK Orchestration.
4. SAP AI Core / Generative AI Hub routes the request to the configured model, for example a GPT model.
5. The backend returns the model answer to the UI.
6. The UI shows both the request and the response in the chat area.

SAP AI Launchpad is used to manage and inspect AI Core resources, such as resource groups, configurations, deployments, and executions. The CAP app itself connects to SAP AI Core through service credentials and environment variables.

The important local variables are:

- `AICORE_SERVICE_KEY`: SAP AI Core service key as JSON.
- `AI_RESOURCE_GROUP`: resource group where the orchestration deployment exists.
- `AI_ORCHESTRATION_DEPLOYMENT_ID`: optional fixed orchestration deployment ID.
- `AI_ORCHESTRATION_CONFIG_ID`: optional orchestration configuration ID from SAP AI Launchpad.
- `AI_ORCHESTRATION_CONFIG_SCENARIO`, `AI_ORCHESTRATION_CONFIG_NAME`, `AI_ORCHESTRATION_CONFIG_VERSION`: optional alternative to `AI_ORCHESTRATION_CONFIG_ID`.
- `AI_MODEL_NAME`: model name to use. For cheap PDF/image testing, use a low-cost model with file or image input support if it is available in your SAP AI Core tenant, for example `gemini-2.5-flash-lite`.

If `AI_ORCHESTRATION_CONFIG_ID` is set, the backend uses the orchestration configuration from SAP AI Launchpad instead of the inline configuration in `srv/lib/ai-orchestration.js`. That Launchpad configuration must support the placeholders used by the app. The AI Prompt chat sends the user text as `user_query`, matching a template placeholder like `{{?user_query}}`.

For PDF document processing, the Launchpad orchestration model must support file input. If the configuration uses a model without file input support, document processing stores the error on the document row with status `Failed`. For cheap testing, configure your Launchpad orchestration to use `gemini-2.5-flash-lite` if it is available in your tenant with file or image input support.

## Document processing

The current local test flow is:

1. Upload a PDF in the `Documents` section of the AI Prompt app.
2. CAP stores the PDF as base64 in local SQLite.
3. CAP sends the PDF file content plus `user_query` to SAP AI Orchestration.
4. The extraction result or error is saved on the document row.
5. The UI list shows the file, status, and extracted result.

This is intentionally simple for local testing. For real mailbox usage, store PDF binaries in object storage or document management instead of SQLite.

Outlook mailbox ingestion is not wired yet. The planned next step is a Microsoft Graph connector that reads PDF attachments from a mailbox, then calls the same local `uploadDocument` and `processDocument` flow.

Useful scripts:

```bash
npm run setup:orchestration
npm run test:ai
```

## Current status

- The CAP service and SQLite product model are available.
- Local PDF document upload and processing persistence is available.
- The `AI Prompt` UI calls `askAssistant` through OData V4.
- Product-related AI actions are implemented in the backend.
- Product-related AI actions are not yet fully integrated into the UI.
- Outlook mailbox ingestion is planned. It is not implemented yet.
- Some generated Bookshop/Fiori files still exist and may be outdated, for example Admin, Books, or Genres references without a matching `AdminService`.

## Main folders

- `app/`: SAP Fiori/UI5 applications and launchpad sandbox.
- `db/`: CAP data model and demo CSV data.
- `srv/`: CAP service definition, service implementation, and AI orchestration helper code.
