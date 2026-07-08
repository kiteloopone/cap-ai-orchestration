sap.ui.define([
  'sap/ui/core/mvc/Controller',
  'sap/m/MessageToast',
  'sap/ui/model/json/JSONModel'
], (Controller, MessageToast, JSONModel) => {
  'use strict';

  const INITIAL_VIEW_STATE = {
    prompt: '',
    messages: [],
    documents: [],
    selectedFileName: '',
    error: '',
    documentError: '',
    documentBusy: false,
    busy: false
  };

  return Controller.extend('cap-ai-orchestration.ai-prompt.controller.App', {
    onInit() {
      if (!this.getView().getModel('view')) {
        this.getView().setModel(new JSONModel({ ...INITIAL_VIEW_STATE }), 'view');
      }

      this.loadDocuments();
    },

    async onSubmit() {
      const view = this.getView();
      const viewModel = this.getViewModel();
      const prompt = (viewModel.getProperty('/prompt') || '').trim();

      if (!prompt) {
        MessageToast.show(this.getResourceBundle().getText('emptyPromptMessage'));
        return;
      }

      viewModel.setProperty('/busy', true);
      viewModel.setProperty('/error', '');

      const messages = viewModel.getProperty('/messages') || [];
      const messageIndex = messages.length;
      viewModel.setProperty('/messages', messages.concat({
        request: prompt,
        requestHtml: this.toHtml(prompt),
        response: '',
        responseHtml: '',
        error: '',
        pending: true
      }));
      viewModel.setProperty('/prompt', '');

      try {
        const operation = view.getModel().bindContext('/askAssistant(...)');
        operation.setParameter('prompt', prompt);
        await operation.execute();

        const result = operation.getBoundContext().getObject();
        const answer = result?.value || '';

        viewModel.setProperty(`/messages/${messageIndex}/response`, answer);
        viewModel.setProperty(`/messages/${messageIndex}/responseHtml`, this.toHtml(answer));
      } catch (error) {
        const errorMessage = this.getErrorMessage(error);
        viewModel.setProperty('/error', errorMessage);
        viewModel.setProperty(`/messages/${messageIndex}/error`, errorMessage);
      } finally {
        viewModel.setProperty(`/messages/${messageIndex}/pending`, false);
        viewModel.setProperty('/busy', false);
      }
    },

    onDocumentFileChange(event) {
      const file = event.getParameter('files')?.[0];
      const viewModel = this.getViewModel();

      this._selectedDocumentFile = file;
      viewModel.setProperty('/documentError', '');
      viewModel.setProperty('/selectedFileName', file?.name || '');
    },

    async onUploadAndProcessDocument() {
      const view = this.getView();
      const viewModel = this.getViewModel();
      const file = this._selectedDocumentFile;

      if (!file) {
        MessageToast.show(this.getResourceBundle().getText('choosePdfFirstMessage'));
        return;
      }

      if (file.type && file.type !== 'application/pdf') {
        viewModel.setProperty('/documentError', this.getResourceBundle().getText('pdfOnlyMessage'));
        return;
      }

      viewModel.setProperty('/documentBusy', true);
      viewModel.setProperty('/documentError', '');

      try {
        const contentBase64 = await this.readFileAsBase64(file);
        const uploadOperation = view.getModel().bindContext('/uploadDocument(...)');
        uploadOperation.setParameter('fileName', file.name);
        uploadOperation.setParameter('mimeType', 'application/pdf');
        uploadOperation.setParameter('contentBase64', contentBase64);
        await uploadOperation.execute();

        const uploaded = uploadOperation.getBoundContext().getObject();
        const documentId = uploaded?.value;

        const processOperation = view.getModel().bindContext('/processDocument(...)');
        processOperation.setParameter('documentId', documentId);
        await processOperation.execute();

        this.byId('documentUploader').clear();
        this._selectedDocumentFile = null;
        viewModel.setProperty('/selectedFileName', '');
        await this.loadDocuments();
      } catch (error) {
        viewModel.setProperty('/documentError', this.getErrorMessage(error));
        await this.loadDocuments();
      } finally {
        viewModel.setProperty('/documentBusy', false);
      }
    },

    async loadDocuments() {
      const view = this.getView();
      const viewModel = this.getViewModel();

      try {
        const listBinding = view.getModel().bindList('/Documents', null, null, null, {
          $orderby: 'receivedAt desc'
        });
        const contexts = await listBinding.requestContexts(0, 100);
        viewModel.setProperty('/documents', contexts.map(context => {
          const document = context.getObject();
          return {
            ...document,
            resultText: document.extractedText || document.errorMessage || ''
          };
        }));
      } catch (error) {
        viewModel.setProperty('/documentError', this.getErrorMessage(error));
      }
    },

    getViewModel() {
      let viewModel = this.getView().getModel('view');

      if (!viewModel) {
        viewModel = new JSONModel({ ...INITIAL_VIEW_STATE });
        this.getView().setModel(viewModel, 'view');
      }

      return viewModel;
    },

    readFileAsBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          const result = String(reader.result || '');
          resolve(result.includes(',') ? result.split(',')[1] : result);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
    },

    formatDocumentStatusState(status) {
      switch (status) {
        case 'Processed':
          return 'Success';
        case 'Failed':
          return 'Error';
        case 'Processing':
          return 'Warning';
        default:
          return 'None';
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
