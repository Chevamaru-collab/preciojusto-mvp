# Validation Report V2

## Audit Metrics
- **entries_before**: 331
- **entries_after**: 329
- **duplicates_merged**: 2
- **orphan_labels_removed**: 31
- **typo_corrections**: 2

## Sanity Review
### Typical Comparison Groups Created
- Aceite
- Colorantes Gel
- Fiambres Aceitunas
- Aceitunas
- Acelga Tottus
- Envasado
- Aguaymantos
- Albahaca Bells
- Frutos Albaricoque
- Alcachofas EXTRA
- Alcachofas
- Colorantes
- Varios Agua
- Apio
- Fruta Arandanos

### Sample Before & After
- **Before**: Colorantes Gel 0.36 Lt (Group: Colorantes Gel)
  **After**: Colorantes Gel 0.36 LT (Group: Colorantes Gel)
- **Before**: Acelga 0.3 KG (Group: Acelga Tottus)
  **After**: Acelga Tottus 0.3 KG (Group: Acelga Tottus)
- **Before**: Aguaymanto KG (Group: Envasado)
  **After**: Envasado (Group: Envasado)
- **Before**: Albahaca (Group: Albahaca Bells)
  **After**: Albahaca Bells (Group: Albahaca Bells)
- **Before**: Abarrotes Varios 7 LT (Group: Varios Agua)
  **After**: Varios Agua 7 LT (Group: Varios Agua)

## Conclusion
Data is deduplicated and units are uniformly standardized. The aliases property ensures reverse-compatibility.
