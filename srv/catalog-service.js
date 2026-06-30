import cds from '@sap/cds';
import { askAssistant, askWithBusinessContext } from './lib/ai-orchestration.js';

export default class CatalogService extends cds.ApplicationService {
  async init() {
    const { Products } = this.entities;

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
        console.error('AI orchestration failed:', error);
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
        console.error('AI orchestration failed:', error);
        return req.error(502, 'AI orchestration request failed.');
      }
    });
    return super.init();
  }
}
