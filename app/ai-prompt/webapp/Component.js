sap.ui.define([
  'sap/ui/core/UIComponent',
  'sap/ui/model/json/JSONModel'
], (UIComponent, JSONModel) => {
  'use strict';

  return UIComponent.extend('cap-ai-orchestration.ai-prompt.Component', {
    metadata: {
      manifest: 'json'
    },

    init() {
      UIComponent.prototype.init.apply(this, arguments);

      this.setModel(new JSONModel({
        prompt: '',
        answer: '',
        answerHtml: '',
        error: '',
        busy: false
      }), 'view');
    }
  });
});