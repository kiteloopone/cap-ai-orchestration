sap.ui.define([
  'sap/ui/core/mvc/Controller',
  'sap/m/MessageToast'
], (Controller, MessageToast) => {
  'use strict';

  return Controller.extend('cap-ai-orchestration.ai-prompt.controller.App', {
    async onSubmit() {
      const view = this.getView();
      const viewModel = view.getModel('view');
      const prompt = (viewModel.getProperty('/prompt') || '').trim();

      if (!prompt) {
        MessageToast.show(this.getResourceBundle().getText('emptyPromptMessage'));
        return;
      }

      viewModel.setProperty('/busy', true);
      viewModel.setProperty('/error', '');
      viewModel.setProperty('/answer', '');
      viewModel.setProperty('/answerHtml', '');

      try {
        const operation = view.getModel().bindContext('/askAssistant(...)');
        operation.setParameter('prompt', prompt);
        await operation.execute();

        const result = operation.getBoundContext().getObject();
        const answer = result?.value || '';

        viewModel.setProperty('/answer', answer);
        viewModel.setProperty('/answerHtml', this.toHtml(answer));
      } catch (error) {
        viewModel.setProperty('/error', this.getErrorMessage(error));
      } finally {
        viewModel.setProperty('/busy', false);
      }
    },

    getResourceBundle() {
      return this.getOwnerComponent().getModel('i18n').getResourceBundle();
    },

    getErrorMessage(error) {
      const fallback = this.getResourceBundle().getText('requestFailedMessage');
      const responseText = error?.error?.message || error?.message;

      return responseText || fallback;
    },

    toHtml(text) {
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\r?\n/g, '<br>');
    }
  });
});