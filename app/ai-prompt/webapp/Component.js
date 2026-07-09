sap.ui.define([
  'sap/ui/core/UIComponent',
  'sap/ui/model/json/JSONModel'
], (UIComponent, JSONModel) => {
  'use strict';

  const INITIAL_VIEW_STATE = {
    prompt: '',
    messages: [],
    documents: [],
    invoiceDocumentAttributes: [],
    selectedFileName: '',
    error: '',
    documentError: '',
    documentBusy: false,
    busy: false
  };

  return UIComponent.extend('cap-ai-orchestration.ai-prompt.Component', {
    metadata: {
      manifest: 'json'
    },

    init() {
      UIComponent.prototype.init.apply(this, arguments);

      this.setModel(new JSONModel({ ...INITIAL_VIEW_STATE }), 'view');
    }
  });
});
