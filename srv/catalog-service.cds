using demo.ai as db from '../db/schema';

service CatalogService {
  entity Products as projection on db.Products;

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
}