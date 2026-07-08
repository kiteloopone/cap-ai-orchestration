import cds from '@sap/cds';
import { analyzePdfDocument, askAssistant, askWithBusinessContext } from './lib/ai-orchestration.js';

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

function getAiErrorMessage(error) {
  const responseError = error?.cause?.response?.data?.error ||
    error?.response?.data?.error;
  const message = responseError?.message ||
    error?.message ||
    'AI document processing failed.';
  const requestId = responseError?.request_id;

  return requestId ? `${message} Request ID: ${requestId}` : message;
}

export default class CatalogService extends cds.ApplicationService {
  async init() {
    const { Products } = this.entities;
    const { Documents } = cds.entities('demo.ai');

    this.on('askAboutProduct', async req => {
      const { productId, question } = req.data;

      if (!productId) {
        return req.error(400, 'productId is required.');
      }

      const product = await SELECT.one.from(Products).where({ ID: productId });

      if (!product) {
        return req.error(404, `Product ${productId} not found.`);
      }

      const businessContext = JSON.stringify(
        {
          type: 'Product',
          data: product
        },
        null,
        2
      );

      try {
        const result = await askWithBusinessContext({
          businessContext,
          question
        });

        console.log('AI token usage:', result.tokenUsage);
        return result.content;
      } catch (error) {
        console.error('AI orchestration failed:', JSON.stringify(getErrorDetails(error), null, 2));
        return req.error(502, 'AI orchestration request failed.');
      }
    });

    this.on('generateProductSummary', async req => {
      const { productId } = req.data;

      const product = await SELECT.one.from(Products).where({ ID: productId });

      if (!product) {
        return req.error(404, `Product ${productId} not found.`);
      }

      const businessContext = JSON.stringify(
        {
          type: 'Product',
          data: product
        },
        null,
        2
      );

      const result = await askWithBusinessContext({
        businessContext,
        question:
          'Create a concise product summary for a business user. Include relevant risks or missing information.'
      });

      return result.content;
    });

    this.on('askAssistant', async req => {
      const { prompt } = req.data;

      if (!prompt || !prompt.trim()) {
        return req.error(400, 'prompt is required.');
      }

      try {
        const result = await askAssistant({ prompt });

        console.log('AI token usage:', result.tokenUsage);
        return result.content;
      } catch (error) {
        console.error('AI orchestration failed:', JSON.stringify(getErrorDetails(error), null, 2));
        return req.error(502, 'AI orchestration request failed.');
      }
    });

    this.on('uploadDocument', async req => {
      const { fileName, mimeType, contentBase64 } = req.data;

      if (!fileName || !fileName.trim()) {
        return req.error(400, 'fileName is required.');
      }

      if (!contentBase64 || !contentBase64.trim()) {
        return req.error(400, 'contentBase64 is required.');
      }

      const normalizedMimeType = mimeType || 'application/pdf';
      if (normalizedMimeType !== 'application/pdf') {
        return req.error(400, 'Only PDF documents are supported for now.');
      }

      const ID = cds.utils.uuid();
      await INSERT.into(Documents).entries({
        ID,
        fileName,
        mimeType: normalizedMimeType,
        source: 'manual-upload',
        status: 'Uploaded',
        receivedAt: new Date().toISOString(),
        contentBase64
      });

      return ID;
    });

    this.on('processDocument', async req => {
      const { documentId } = req.data;

      if (!documentId) {
        return req.error(400, 'documentId is required.');
      }

      const document = await SELECT.one.from(Documents).where({ ID: documentId });

      if (!document) {
        return req.error(404, `Document ${documentId} not found.`);
      }

      await UPDATE(Documents).set({
        status: 'Processing',
        errorMessage: null
      }).where({ ID: documentId });

      try {
        const result = await analyzePdfDocument({
          fileName: document.fileName,
          contentBase64: document.contentBase64
        });

        console.log('AI token usage:', result.tokenUsage);

        await UPDATE(Documents).set({
          status: 'Processed',
          processedAt: new Date().toISOString(),
          extractedText: result.content,
          errorMessage: null
        }).where({ ID: documentId });

        return result.content;
      } catch (error) {
        const details = getErrorDetails(error);
        const message = getAiErrorMessage(error);
        console.error('AI document processing failed:', JSON.stringify(details, null, 2));

        await UPDATE(Documents).set({
          status: 'Failed',
          processedAt: new Date().toISOString(),
          errorMessage: message
        }).where({ ID: documentId });

        return message;
      }
    });
    return super.init();
  }
}
