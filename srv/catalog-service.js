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

function parseJsonObject(text) {
  const raw = String(text || '').trim();
  const withoutFence = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    const start = withoutFence.indexOf('{');
    const end = withoutFence.lastIndexOf('}');

    if (start >= 0 && end > start) {
      return JSON.parse(withoutFence.slice(start, end + 1));
    }

    throw new Error('AI response did not contain a JSON object.');
  }
}

function toDate(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

function toDecimal(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const normalized = typeof value === 'string'
    ? value.replace(/\s/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.')
    : value;
  const number = Number(normalized);

  return Number.isFinite(number) ? number : null;
}

function toText(value, maxLength) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = Array.isArray(value) ? value.join('; ') : String(value);
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function toIsoDate(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const isoMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
  if (isoMatch) {
    return isoMatch[0];
  }

  const germanMatch = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return germanMatch ? `${germanMatch[3]}-${germanMatch[2]}-${germanMatch[1]}` : null;
}

function summarizeValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map(item => typeof item === 'string'
        ? item
        : [
          item.description,
          item.quantity,
          item.total !== undefined ? `total ${item.total}` : null
        ].filter(Boolean).join(' - '))
      .filter(Boolean)
      .join('; ');
  }

  if (typeof value === 'object') {
    if (Array.isArray(value.items)) {
      return summarizeValue(value.items);
    }

    return Object.entries(value)
      .filter(([, entryValue]) => entryValue !== null && entryValue !== undefined)
      .map(([key, entryValue]) => `${key}: ${Array.isArray(entryValue) || typeof entryValue === 'object' ? summarizeValue(entryValue) : entryValue}`)
      .join('; ');
  }

  return String(value);
}

function normalizeInvoiceAttributes(attributes) {
  const summary = attributes.summary;

  return {
    documentType: attributes.documentType,
    supplierName: attributes.supplierName || attributes.sender?.name,
    invoiceNumber: attributes.invoiceNumber || summary?.invoiceNumber,
    invoiceDate: attributes.invoiceDate || attributes.documentDate,
    dueDate: attributes.dueDate,
    netAmount: attributes.netAmount || summary?.netAmount,
    taxAmount: attributes.taxAmount || summary?.taxAmount,
    totalAmount: attributes.totalAmount,
    currency: attributes.currency,
    paymentReference: attributes.paymentReference || summary?.paymentReference,
    summary: summarizeValue(summary),
    missingInformation: attributes.missingInformation
  };
}

export default class CatalogService extends cds.ApplicationService {
  async init() {
    const { Products } = this.entities;
    const { Documents, InvoiceDocumentAttributes } = cds.entities('demo.ai');

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

        const attributes = normalizeInvoiceAttributes(parseJsonObject(result.content));

        await UPDATE(Documents).set({
          status: 'Processed',
          processedAt: new Date().toISOString(),
          extractedText: result.content,
          errorMessage: null
        }).where({ ID: documentId });

        await DELETE.from(InvoiceDocumentAttributes).where({ document_ID: documentId });
        await INSERT.into(InvoiceDocumentAttributes).entries({
          ID: cds.utils.uuid(),
          document_ID: documentId,
          fileName: document.fileName,
          documentType: toText(attributes.documentType, 60),
          supplierName: toText(attributes.supplierName, 255),
          invoiceNumber: toText(attributes.invoiceNumber, 100),
          invoiceDate: toIsoDate(attributes.invoiceDate),
          dueDate: toIsoDate(attributes.dueDate),
          netAmount: toDecimal(attributes.netAmount),
          taxAmount: toDecimal(attributes.taxAmount),
          totalAmount: toDecimal(attributes.totalAmount),
          currency: toText(attributes.currency, 3),
          paymentReference: toText(attributes.paymentReference, 255),
          summary: toText(attributes.summary, 1000),
          missingInfo: toText(attributes.missingInformation, 1000),
          extractedAt: new Date().toISOString(),
          rawJson: JSON.stringify(attributes)
        });

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
