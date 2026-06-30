using CatalogService from '../../srv/catalog-service';

////////////////////////////////////////////////////////////////////////////
//
//	Products Object Page
//
annotate CatalogService.Products with @(UI : {
  HeaderInfo        : {
    TypeName        : '{i18n>Product}',
    TypeNamePlural  : '{i18n>Products}',
    Description     : {Value : category}
  },
  HeaderFacets      : [{
    $Type  : 'UI.ReferenceFacet',
    Label  : '{i18n>Description}',
    Target : '@UI.FieldGroup#Descr'
  }, ],
  Facets            : [{
    $Type  : 'UI.ReferenceFacet',
    Label  : '{i18n>Details}',
    Target : '@UI.FieldGroup#Price'
  }, ],
  FieldGroup #Descr : {Data : [{Value : description}, ]},
  FieldGroup #Price : {Data : [
    {Value : price},
    {
      Value : currency,
      Label : '{i18n>Currency}'
    },
  ]},
});


////////////////////////////////////////////////////////////////////////////
//
//	Products List Page
//
annotate CatalogService.Products with @(UI : {
  SelectionFields : [
    ID,
    category,
    price
  ],
  LineItem: [
    {$Type: 'UI.DataField', Value: name, Label: '{i18n>Name}'},
    {$Type: 'UI.DataField', Value: description, Label: '{i18n>Description}'},
    {$Type: 'UI.DataField', Value: category},
    {$Type: 'UI.DataField', Value: price},
    {$Type: 'UI.DataField', Value: currency},
  ]
});

