# Optional Body Assessment

Status: Implemented for development-preview use; qualified review remains a release gate. Scope: generally healthy adults aged 18-56 who confirm eligibility. This describes measurements and goal tradeoffs, not a diagnosis or a validated muscularity/body-type classifier.

## Inputs and Privacy

- Opt-in checkbox, off by default. Current age, height, and weight are reused; waist is required only when assessment is enabled.
- Waist: 35-200 cm, at most one decimal place, with an explicit measurement site. New forms default to hipbone level for RFM; the alternative ribs-to-hips midpoint is for NICE interpretation. Changing site clears the waist value and requires remeasurement; do not substitute trouser size.
- A separate existing body-fat result is optional, 3-60%, with method: DXA, bioimpedance, skinfold calipers, or other/unknown. It is user-provided and not verified or overwritten by the RFM estimate.
- Optional self-description: slim, muscular, higher body fat, lower muscle/higher body fat, unsure, or prefer not to say. Always display as self-reported, never as a confirmed measurement.
- Numeric entry bounds are software support limits, not healthy ranges. No photos, inferred ancestry, or medical-history text are collected.
- Body details are stored only with the existing explicit device-local remembering consent and after Calculate my targets. The standalone assessment button does not save them. Explain shared-browser visibility and deletion.

## RFM Body Fat

For ages 20-56, height and hipbone-level waist use the published Relative Fat Mass equation:

```text
RFM body fat (%) = 64 - 20 * (height / waist) + 12 * category
category: male = 0, female = 1
height and waist must use the same units (both cm in this app)
```

RFM does not use weight or an age-correction term. Age selects evidence scope, and weight remains relevant to BMI. The original study derived the model in adults 20-85 and validated in adults 20-69 in separate NHANES cycles, using DXA as reference. This implementation conservatively withholds RFM at 18-19 without removing their other supported features. No coefficient is inferred for missing/unsupported categories or all hormonal/physiological circumstances.

The study measured around the bare trunk at the uppermost lateral border of the right ilium (top of hipbone), standing with horizontal tape at the end of expiration. This is not the ribs-to-hips midpoint. Only iliac-site input produces RFM. Midpoint input retains the NICE path below; the two protocols are never silently interchanged.

Display a whole-percent approximate estimate, not a direct measurement, guaranteed accuracy percentage, invented confidence interval, muscle-mass measurement, or diagnosis. Examples: height 180 cm / waist 80 cm yields 19% male and 31% female before display rounding. Performance varies by population/body composition, including leaner and muscular people. The app withholds values outside its 3-60% output support range rather than clamping; this range is a product bound, not a healthy range or published validity threshold.

## Other Indicators

```text
BMI = current weight kg / (height cm / 100)^2
waist-to-height ratio = waist cm / height cm
```

Age gates the adult product scope; it is not used to invent an age-based body-fat formula. BMI follows the NHS adult-from-18 convention, not the CDC adult-from-20 convention. No sex or equation category is needed for the waist-ratio bands.

NICE recommends interpreting midpoint waist ratio alongside BMI in adults with BMI below 35. These screening bands are applied only to explicitly midpoint-site input. For iliac input, the displayed ratio is descriptive and no NICE risk band is assigned. Use unrounded values for classification; display BMI to one decimal and waist ratio to up to four decimals, explaining rounding.

| Waist ratio, when BMI <35 | UI interpretation |
| --- | --- |
| Below 0.40 | Below the published classification range; recheck measurement, not a leanness/health claim |
| 0.40 to below 0.50 | No raised waist-ratio indicator; not proof of overall health or muscle mass |
| 0.50 to below 0.60 | Raised waist relative to height; associated increased central-adiposity risk, not diagnosis |
| 0.60 or higher | Higher waist relative to height; associated further increased risk, with professional-guidance prompt |
| BMI >=35 | Do not apply these waist-ratio bands or reassure from a low ratio; interpretation outside scope |

## Approximate Profile Summary

For midpoint input, preserve the original priority: BMI >=35 -> outside NICE interpretation scope; BMI <18.5 -> lower weight-for-height; then waist-ratio bands; otherwise higher or mid-range weight-for-height/lower waist ratio. For iliac input, provide lower/mid-range/higher weight-for-height context alongside RFM availability and percentage, without applying midpoint risk bands. Neither route establishes muscularity or "skinny-fat" status.

BMI and waist do not measure muscle or distinguish all fat distributions. An existing body-fat percentage still does not establish muscle mass. Therefore the app does not infer labels such as "muscular" or "skinny-fat" from these measurements. A user's optional description remains separately marked self-reported. Individual/ancestry-related health risk can vary; a middle-range indicator is not medical clearance.

## Goal Context and Independence

- Explain possible goal tradeoffs using measurements, preferences, and training history. Never change goal, calories, macro targets, or exercises automatically based on a profile label or self-description.
- Preserve the existing nutrition BMI support range (18.5 to below 30). BMI outside this range prompts individual nutrition/training guidance, even when a waist ratio is lower.
- Assessment remains independently available when nutrition is outside BMI/calorie/pace limits, including the case where all weekly paces are disabled. It is not a workaround for obtaining withheld calorie targets.
- The standalone button requires valid age, current weight/height, waist/site, optional supplied measurements, and eligibility. No nutrition goal/activity is required. A supported formula category is needed for RFM specifically, not the rest of the measurement profile.
- Changes to relevant inputs or eligibility hide old assessment results. Restoring saved measurements does not restore eligibility or immediately show an interpretation.

## Persistence and Verification

The existing key `liftfuel.profile.v1` now stores record version 4. Its optional body object includes waistSite. Versions 1/2 restore without invented body inputs. Version 3 waist measurements are explicitly tagged as their original midpoint protocol; they are not used for RFM until the user changes site, remeasures, and enters a new value. Version 4 rejects unknown/missing protocols. No calculated RFM, interpretation, or eligibility is persisted. Turning assessment off and saving removes the body object; deleting saved data resets the profile.

`public/js/body-assessment.js` owns validation/interpretation; `public/js/measurements.js` shares the existing strict metric parser with nutrition. Tests cover thresholds at 0.40/0.50/0.60 and BMI 35, nutrition independence, consent/eligibility, input types, legacy restoration, and responsive/error behavior. Qualified review, manual screen-reader checks, and real-device testing remain open.

## Sources

- NICE NG246, identifying and assessing overweight, obesity, and central adiposity, recommendations 1.9.3-1.9.15 and measurement Box 1: https://www.nice.org.uk/guidance/ng246/chapter/Identifying-and-assessing-overweight-obesity-and-central-adiposity
- NHS adult BMI eligibility, measurement context, and muscle/fat limitations: https://www.nhs.uk/health-assessment-tools/calculate-your-body-mass-index/calculate-bmi-for-adults/
- Woolcott and Bergman (2018), *Relative fat mass (RFM) as a new estimator of whole-body fat percentage*, Scientific Reports 8, 10980: https://www.nature.com/articles/s41598-018-29362-1 ; https://pmc.ncbi.nlm.nih.gov/articles/PMC6054651/
- NHANES anthropometry protocol cited by the study: https://www.cdc.gov/nchs/data/nhanes/nhanes_07_08/manual_an.pdf
