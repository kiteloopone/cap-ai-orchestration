namespace demo.ai;

entity Products {
  key ID          : String(36);
      name        : String(100);
      description : String(1000);
      category    : String(100);
      price       : Decimal(15,2);
      currency    : String(3);
}
