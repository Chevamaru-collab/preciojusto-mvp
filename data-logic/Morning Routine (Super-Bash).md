node scrapers/run-all.js ; if ($?) { node ontology/enforce_ontology.js } ; if ($?) { node MVP/data-logic/verify-data.js } ; if ($?) { node MVP/data-logic/build_comparison_dataset.js }
