namespace demo.ai;

entity Products {
  key ID          : String(36);
      name        : String(100);
      description : String(1000);
      category    : String(100);
      price       : Decimal(15,2);
      currency    : String(3);
}

entity Documents {
  key ID            : UUID;
      fileName      : String(255);
      mimeType      : String(100);
      source        : String(50);
      status        : String(30);
      receivedAt    : DateTime;
      processedAt   : DateTime;
      contentBase64 : LargeString;
      extractedText : LargeString;
      errorMessage  : LargeString;
}

entity InvoiceDocumentAttributes {
  key ID               : UUID;
      document         : Association to Documents;
      fileName         : String(255);
      documentType     : String(60);
      supplierName     : String(255);
      invoiceNumber    : String(100);
      invoiceDate      : Date;
      dueDate          : Date;
      netAmount        : Decimal(15,2);
      taxAmount        : Decimal(15,2);
      totalAmount      : Decimal(15,2);
      currency         : String(3);
      paymentReference : String(255);
      summary          : String(1000);
      missingInfo      : String(1000);
      extractedAt      : DateTime;
      rawJson          : LargeString;
}
