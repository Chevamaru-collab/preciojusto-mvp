# Validation Report V3

## Audit Metrics
- **entries_before_v2**: 329
- **entries_after_v3**: 328
- **retailer_contamination_removed**: 1
- **brands_extracted**: 3
- **garbage_categories_removed**: 18
- **ambiguous_cases_flagged (needs_review)**: 231
- **ATADO_unit_cases_detected**: 1

## Structural Improvements
- Strict commercial hierarchy enforced: `rubro -> categoria -> subcategoria`
- Brand and Retailer strictly isolated to `brand` field.
- Avena and Leche grouped by specific consumption type, preserving substitutions.
- Mix Products decoupled from single-ingredient origins.

## Selected Sample Before & After
*Visualizing the semantic shifts from V2*
- **Before**: Aceite Vegetal 5 LT (Cat: Aceite, Sub: Vegetal, Grp: Aceite)
  **After V3**: Aceite Vegetal 5 LT (Rubro: Abarrotes, Grp: Aceite Vegetal, Brand: null, Unit: LT, Review: false)
- **Before**: Aceite Vegetal 1 LT (Cat: Aceite, Sub: Vegetal, Grp: Aceite)
  **After V3**: Aceite Vegetal 1 LT (Rubro: Abarrotes, Grp: Aceite Vegetal, Brand: null, Unit: LT, Review: false)
- **Before**: Aceite Vegetal 0.9 LT (Cat: Aceite, Sub: Vegetal, Grp: Aceite)
  **After V3**: Aceite Vegetal 0.9 LT (Rubro: Abarrotes, Grp: Aceite Vegetal, Brand: null, Unit: LT, Review: false)
- **Before**: Colorantes Gel 0.36 LT (Cat: Colorantes, Sub: Gel, Grp: Colorantes Gel)
  **After V3**: Colorantes Gel 0.36 LT (Rubro: Ingredientes, Grp: Colorantes Gel, Brand: null, Unit: LT, Review: false)
- **Before**: Fiambres Aceitunas 0.79 KG (Cat: Fiambres, Sub: Aceitunas, Grp: Fiambres Aceitunas)
  **After V3**: Fiambres Aceitunas 0.79 KG (Rubro: Embutidos, Grp: Fiambres Aceitunas, Brand: null, Unit: KG, Review: false)
- **Before**: Fiambres Aceitunas 1 KG (Cat: Fiambres, Sub: Aceitunas, Grp: Fiambres Aceitunas)
  **After V3**: Fiambres Aceitunas 1 KG (Rubro: Embutidos, Grp: Fiambres Aceitunas, Brand: null, Unit: KG, Review: false)
- **Before**: Aceitunas 0.79 KG (Cat: Aceitunas, Sub: , Grp: Aceitunas)
  **After V3**: Aceitunas 0.79 KG (Rubro: Aceitunas, Grp: Aceitunas, Brand: null, Unit: KG, Review: true)
- **Before**: Acelga Tottus 0.3 KG (Cat: Acelga, Sub: Tottus, Grp: Acelga Tottus)
  **After V3**: Acelga 0.3 KG (Rubro: Verduras, Grp: Acelga, Brand: Tottus, Unit: KG, Review: false)
- **Before**: Envasado (Cat: Envasado, Sub: , Grp: Envasado)
  **After V3**: Frutas Mix Frutas KG (Rubro: Frutas, Grp: Frutas Mix Frutas Mix, Brand: null, Unit: KG, Review: true)
- **Before**: Aguaymantos 0.2 KG (Cat: Aguaymantos, Sub: , Grp: Aguaymantos)
  **After V3**: Frutas Aguaymantos 0.2 KG (Rubro: Frutas, Grp: Frutas Aguaymantos, Brand: null, Unit: KG, Review: false)
- **Before**: Aguaymantos 0.25 KG (Cat: Aguaymantos, Sub: , Grp: Aguaymantos)
  **After V3**: Frutas Aguaymantos 0.25 KG (Rubro: Frutas, Grp: Frutas Aguaymantos, Brand: null, Unit: KG, Review: false)
- **Before**: Albahaca Bells (Cat: Albahaca, Sub: Bells, Grp: Albahaca Bells)
  **After V3**: Albahaca AT. (Rubro: Verduras, Grp: Albahaca, Brand: Bells, Unit: AT., Review: false)
- **Before**: Frutos Albaricoque 1 KG (Cat: Frutos, Sub: Albaricoque, Grp: Frutos Albaricoque)
  **After V3**: Frutos Albaricoque 1 KG (Rubro: Frutos, Grp: Frutos Albaricoque, Brand: null, Unit: KG, Review: true)
- **Before**: Alcachofas EXTRA 1 UND (Cat: Alcachofas, Sub: EXTRA, Grp: Alcachofas EXTRA)
  **After V3**: Alcachofas 1 UND (Rubro: Verduras, Grp: Alcachofas, Brand: Extra, Unit: UND, Review: false)
- **Before**: Alcachofas 1 UND (Cat: Alcachofas, Sub: , Grp: Alcachofas)
  **After V3**: Colorantes Polvo 1 UND (Rubro: Ingredientes, Grp: Colorantes Polvo, Brand: null, Unit: UND, Review: false)

## Conclusion
V3 catalog enforces structural comparability representing Peru's retail buying decisions.
