RULE 01:
Distinct purchasable products must have isolated comparison_group values.

RULE 02:
Generic categories must not appear as final comparison identifiers when specific variants exist.

RULE 03:
If categoria is a commercial family (e.g. Menestras), comparison_group must represent the specific item.

RULE 04:
Specific product types must not be promoted to parallel root categories when a valid parent category exists.

RULE 05:
Recovered unknown or garbage entries must preserve their original textual identity when available.

RULE 06:
Unknown entries must not collapse into a single deduplicated entity.

RULE 07:
All unresolved or ambiguous entries must be marked with needs_review = true.

RULE 08:
Empty or metadata-free records must remain distinguishable and must not absorb other unresolved entries.
