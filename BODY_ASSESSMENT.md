# Optional Body Assessment

Status: Implemented for development-preview use; qualified review remains a release gate. Scope: generally healthy adults aged 18-56 who confirm eligibility. This describes measurements and goal tradeoffs, not a diagnosis or a validated muscularity/body-type classifier.

## Inputs and Privacy

- Opt-in checkbox, off by default. Current age, height, and weight are reused; waist is required only when assessment is enabled.
- Waist: 35-200 cm, at most one decimal place. Measure midway between the lowest ribs and top of the hips after breathing out naturally; do not use trouser size.
- Existing body-fat estimate: optional, 3-60%, at most one decimal place. Require a method when supplied: DXA, bioimpedance, skinfold calipers, or other/unknown. The site does not calculate or verify this number.
- Optional self-description: slim, muscular, higher body fat, lower muscle/higher body fat, unsure, or prefer not to say. Always display as self-reported, never as a confirmed measurement.
- Numeric entry bounds are software support limits, not healthy ranges. No photos, inferred ancestry, or medical-history text are collected.
- Body details are stored only with the existing explicit device-local remembering consent and after Calculate my targets. The standalone assessment button does not save them. Explain shared-browser visibility and deletion.

## Calculated Indicators

```text
BMI = current weight kg / (height cm / 100)^2
waist-to-height ratio = waist cm / height cm
```

Age gates the adult product scope; it is not used to invent an age-based body-fat formula. BMI follows the NHS adult-from-18 convention, not the CDC adult-from-20 convention. No sex or equation category is needed for the waist-ratio bands.

NICE recommends interpreting waist ratio alongside BMI in adults with BMI below 35. Use unrounded values for classification; display BMI to one decimal and waist ratio to up to four decimals, explaining rounding.

| Waist ratio, when BMI <35 | UI interpretation |
| --- | --- |
| Below 0.40 | Below the published classification range; recheck measurement, not a leanness/health claim |
| 0.40 to below 0.50 | No raised waist-ratio indicator; not proof of overall health or muscle mass |
| 0.50 to below 0.60 | Raised waist relative to height; associated increased central-adiposity risk, not diagnosis |
| 0.60 or higher | Higher waist relative to height; associated further increased risk, with professional-guidance prompt |
| BMI >=35 | Do not apply these waist-ratio bands or reassure from a low ratio; interpretation outside scope |

## Approximate Profile Summary

Priority order: BMI >=35 -> outside interpretation scope; BMI <18.5 -> lower weight-for-height; then waist ratio >=0.60 -> higher waist profile; >=0.50 -> raised waist profile; <0.40 -> recheck waist measurement; otherwise BMI >=25 -> higher weight-for-height/lower waist ratio; otherwise mid-range weight-for-height/lower waist ratio.

BMI and waist do not measure muscle or distinguish all fat distributions. An existing body-fat percentage still does not establish muscle mass. Therefore the app does not infer labels such as "muscular" or "skinny-fat" from these measurements. A user's optional description remains separately marked self-reported. Individual/ancestry-related health risk can vary; a middle-range indicator is not medical clearance.

## Goal Context and Independence

- Explain possible goal tradeoffs using measurements, preferences, and training history. Never change goal, calories, macro targets, or exercises automatically based on a profile label or self-description.
- Preserve the existing nutrition BMI support range (18.5 to below 30). BMI outside this range prompts individual nutrition/training guidance, even when a waist ratio is lower.
- Assessment remains independently available when nutrition is outside BMI/calorie/pace limits, including the case where all weekly paces are disabled. It is not a workaround for obtaining withheld calorie targets.
- The standalone button requires valid age, current weight/height, waist, optional supplied measurements, and eligibility. It does not require a nutrition goal, activity level, or equation category.
- Changes to relevant inputs or eligibility hide old assessment results. Restoring saved measurements does not restore eligibility or immediately show an interpretation.

## Persistence and Verification

The existing key `liftfuel.profile.v1` now stores record version 3. `profile.body` is null when disabled, or contains validated waist, existing body-fat value/method, and self-description. No assessment result or eligibility confirmation is saved. Version 1/2 records restore prior base inputs and targets without inventing body measurements. Turning assessment off and saving removes its stored body object; deleting saved data resets the profile.

`public/js/body-assessment.js` owns validation/interpretation; `public/js/measurements.js` shares the existing strict metric parser with nutrition. Tests cover thresholds at 0.40/0.50/0.60 and BMI 35, nutrition independence, consent/eligibility, input types, legacy restoration, and responsive/error behavior. Qualified review, manual screen-reader checks, and real-device testing remain open.

## Sources

- NICE NG246, identifying and assessing overweight, obesity, and central adiposity, recommendations 1.9.3-1.9.15 and measurement Box 1: https://www.nice.org.uk/guidance/ng246/chapter/Identifying-and-assessing-overweight-obesity-and-central-adiposity
- NHS adult BMI eligibility, measurement context, and muscle/fat limitations: https://www.nhs.uk/health-assessment-tools/calculate-your-body-mass-index/calculate-bmi-for-adults/
