using demo.ai as db from '../db/schema';

service CatalogService {
  entity Products as projection on db.Products;
  entity Documents as projection on db.Documents
    excluding { contentBase64 };
  entity InvoiceDocumentAttributes as projection on db.InvoiceDocumentAttributes
    excluding { rawJson };

  action askAboutProduct(
    productId : UUID,
    question  : String
  ) returns String;

  action generateProductSummary(
    productId : UUID
  ) returns String;

  action askAssistant(
    prompt : String
  ) returns String;

  action uploadDocument(
    fileName      : String,
    mimeType      : String,
    contentBase64 : LargeString
  ) returns UUID;

  action processDocument(
    documentId : UUID
  ) returns String;
}
