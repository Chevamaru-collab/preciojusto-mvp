PrecioJusto Ontology Pipeline

1. Generate canonical products
node ontology/build_canonical.js

2. Validate ontology
node ontology/ontology_checker.js

3. Build matcher catalog
node ontology/build_product_matcher_catalog.js

4. Run matcher tests
node ontology/product_matcher_catalog_tests.js