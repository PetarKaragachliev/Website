# Nutrient and Meal References

Status: Implemented development-preview guidance; qualified nutrition/content review remains required. Research date: 2026-11-03.

## Output Meaning

The app has no food diary or food-by-food menu. It cannot infer actual fiber, sugar, fatty-acid, cholesterol, mineral, or vitamin intake from a calorie/macro estimate. New outputs are explicitly **intake references**, **limits**, or **information**, never measured consumption, deficiency diagnoses, or supplement prescriptions.

US Dietary Reference Intakes (DRIs) use the selected male/female category and age. This reuses the equation-category input with an explicit explanation; it is not a complete account of physiology or individual requirements. Age 18 uses the 14-18 reference row, not the 19+ row. Pregnancy, lactation, medical needs, medications, menstrual status, smoking, and dietary patterns can change requirements.

RDA means Recommended Dietary Allowance; AI means Adequate Intake. FDA label Daily Values are not substituted for age/category-specific DRIs. Values below are total daily intake references, not recommended supplemental doses.

## Energy References and Limits

Let `E` be the unrounded calculated daily calorie estimate.

| Nutrient | Displayed guidance | Meaning / source |
| --- | --- | --- |
| Fiber | About `14 * E / 1000` g/day | Energy-density reference from the DRI AI framework; increase gradually with adequate fluids [S1] |
| Free / added sugars | Less than about `0.05 * E / 4` g/day | Owner-selected stricter 5%-of-energy limit, corresponding to WHO's conditional recommendation. Free sugars include added sugars plus honey/syrup/juice sugars; not a quota to consume and not a limit on intact-fruit/plain-milk sugars [S3] |
| Saturated fat | Less than about `0.1 * E / 9` g/day | WHO under-10%-of-energy limit, not a required intake; individual guidance can be stricter [S3] |
| Cholesterol | FDA Daily Value: 300 mg/day | Labeling reference, not required intake, a personalized target, or a universal maximum for every healthy person [S2] |
| Sodium | Less than 2300 mg/day | General intake limit, not the 1500 mg AI or a formal universal UL; chronic-disease-risk-reduction guidance and individual sweat/medical needs differ [S4] |

WHO free-sugar guidance is deliberately named and distinguished from total sugar and FDA added-sugar labeling. It is not presented as the latest US DGA added-sugar prescription. Numeric display is rounded to at most one decimal place and marked approximate where energy-based; the underlying calculations retain precision.

Per the owner's revised scope, there is one free/added-sugars row and no separate total-sugar, monounsaturated-fat, polyunsaturated-fat, or trans-fat row. Removal does not recommend zero unsaturated fat. The stricter sugar calculation yields 25 g at 2000 kcal and 32.55 g at 2604 kcal before display rounding.

## Age and Category References

Each cell is **male / female**. Identical source age bands are merged only where their values match.

| Nutrient and daily unit | Age 18 | Ages 19-30 | Ages 31-50 | Ages 51-56 | Basis |
| --- | --- | --- | --- | --- | --- |
| Vitamin A, mcg RAE | 900 / 700 | 900 / 700 | 900 / 700 | 900 / 700 | RDA [S5] |
| Vitamin C, mg | 75 / 65 | 90 / 75 | 90 / 75 | 90 / 75 | RDA [S6] |
| Calcium, mg | 1300 / 1300 | 1000 / 1000 | 1000 / 1000 | 1000 / 1200 | RDA [S7] |
| Iron, mg | 11 / 15 | 8 / 18 | 8 / 18 | 8 / 8 | RDA [S8] |
| Magnesium, mg | 410 / 360 | 400 / 310 | 420 / 320 | 420 / 320 | RDA [S9] |
| Potassium, mg | 3000 / 2300 | 3400 / 2600 | 3400 / 2600 | 3400 / 2600 | AI [S10] |
| Omega-3 ALA, mg | 1600 / 1100 | 1600 / 1100 | 1600 / 1100 | 1600 / 1100 | AI for ALA only [S11] |

Vitamin A uses **mcg RAE**, not unqualified micrograms or IU. Omega-3 is explicitly **ALA**, not an EPA+DHA, fish-oil, or total-omega-3 dose. Potassium uses current age/category AIs, not the 4700 mg FDA label Daily Value.

Smoking increases the vitamin C reference by 35 mg/day; the app explains this rather than assuming smoking status. Baseline iron values do not account for vegetarian diets or individual menstrual status. The 350 mg/day magnesium supplemental UL does not apply to naturally occurring food magnesium. No supplements are automatically recommended. Kidney conditions and medication interactions need qualified guidance.

## Meal Structure

Default suggestion: **four eating occasions**, while explaining that three or four meals can work. An optional example is 08:00, 12:00, 16:00, and 20:00. Four-hour intervals are not enforced or labeled healthiest for everyone. Adjust to hunger, waking hours, training, preferences, and professional advice; do not force late eating to match the example.

An even split shows approximately `E / 4` kcal and `daily protein / 4` grams per occasion. This partitions existing totals, adds no calories, and is neither a complete menu nor a requirement that each meal be identical. Rounded per-meal values may not sum exactly to rounded daily totals.

ISSN discusses protein distribution every 3-4 hours for exercising people [S12]. This supports an optional practical pattern, not proof of an optimal universal meal count or general-health interval. We do not promise better health, fat loss, or muscle growth from following a clock schedule.

## Implementation and Tests

- `public/js/guidance.js` builds references and the meal example from supported age/category, unrounded calories, and protein.
- `calculateNutrition` attaches guidance only after eligibility, input, BMI, calorie, and macro checks pass.
- The interface hides guidance on profile/eligibility changes and for invalid/unsupported results; restored profiles do not reveal it before confirmation/recalculation.
- No new inputs or storage fields are needed. Derived references/meals are recalculated, not persisted as observed intake.
- `tests/unit/guidance.test.js` checks source-table boundaries, units, no invented numeric goals, energy scaling, and conservation of the meal split. Browser scenarios cover labels, updates, eligibility, navigation, and responsive reflow.

## Sources

NIH ODS reference tables were retrieved through a text proxy where direct automated access returned HTTP 403. Links below are the original public sources; database hosting is not an endorsement of this app.

- S1: National Academies/IOM, *Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids*: https://www.nationalacademies.org/read/10490/chapter/1
- S2: FDA, *Daily Value on the Nutrition and Supplement Facts Labels*: https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels
- S3: WHO, *Healthy diet*: https://www.who.int/news-room/fact-sheets/detail/healthy-diet
- S4: National Academies, *Dietary Reference Intakes for Sodium and Potassium* (2019): https://www.nationalacademies.org/read/25353/chapter/2
- S5: NIH ODS, Vitamin A: https://ods.od.nih.gov/factsheets/VitaminA-HealthProfessional/
- S6: NIH ODS, Vitamin C: https://ods.od.nih.gov/factsheets/VitaminC-HealthProfessional/
- S7: NIH ODS, Calcium: https://ods.od.nih.gov/factsheets/Calcium-HealthProfessional/
- S8: NIH ODS, Iron: https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/
- S9: NIH ODS, Magnesium: https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/
- S10: NIH ODS, Potassium: https://ods.od.nih.gov/factsheets/Potassium-HealthProfessional/
- S11: NIH ODS, Omega-3 Fatty Acids: https://ods.od.nih.gov/factsheets/Omega3FattyAcids-HealthProfessional/
- S12: ISSN, *Position Stand: protein and exercise* (2017): https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/
