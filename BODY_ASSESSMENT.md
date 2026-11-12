# Body Analyzer

Status: Bonus body analysis in the Bulgarian nutrition-first development preview; professional content/body-composition review remains a release gate. All inputs are metric. Software support is ages 18-56, height 130-230 cm, weight 35-250 kg; entry bounds are not healthy ranges. Existing body formulas and limits are unchanged.

## Inputs and Waist Protocols

Required: selected male/female formula category, whole-year age, height, current weight, and `waistRfm` at the uppermost lateral border of the right ilium (top of hipbone), standing, bare trunk, horizontal tape, after normal expiration. This is not automatically the narrowest waist.

Optional: `waistWhtr` at the midpoint between the lowest rib and top of hips; hip at the widest buttock circumference; chest at its fullest relaxed level after normal expiration; relaxed mid-upper arm; mid-thigh between groin fold/knee; wrist at its narrowest position. All circumference inputs allow one decimal place and reject unsupported/nonfinite values. Optional `regularTraining` is a strict boolean self-report, not a muscle measurement.

The two waists are independent. `waistRfm` determines RFM. `waistWhtr` determines NICE WHtR interpretation. If midpoint waist is absent, display `waistRfm / height` as descriptive only, without applying NICE thresholds. Waist/hip and chest/waist proportions require the midpoint waist; the RFM measurement is not silently substituted for these additional ratios.

## Calculations

```text
BMI = weight kg / (height cm / 100)^2
Male RFM (%) = 64 - 20 * height cm / waistRfm cm
Female RFM (%) = 76 - 20 * height cm / waistRfm cm
Estimated fat mass kg = weight * unrounded RFM / 100
Estimated fat-free mass kg = weight - estimated fat mass
WHtR = (waistWhtr, or explicitly descriptive waistRfm fallback) / height
```

Fat-free mass includes water, bone, organs and other tissues: it is not muscle mass. No other body-fat method or reported percentage is used. Only display values are rounded; RFM displays one decimal, with unrounded values used for masses and classification. RFM is withheld at ages 18-19 or outside the app's 3-60% estimate support range; no clamping or invented replacement values. The output range is a product bound, not a healthy range or a published RFM validity threshold.

Adult BMI categories apply only from age 20: below 18.5 underweight; 18.5 to below 25 normal; 25 to below 30 overweight; 30 to below 35 obesity I; 35 to below 40 obesity II; 40+ obesity III. Under 20, show numeric BMI without adult weight classification or RFM-derived masses.

For midpoint waist with BMI below 35, NICE bands are below 0.40 (outside published classification range), 0.40 to below 0.50 (not raised), 0.50 to below 0.60 (increased), and 0.60+ (high). NICE's adult framework includes ages 18-19 independently of the BMI weight-category restriction. At BMI >=35, do not apply these risk bands or reassure from a low ratio.

## Reference Comparison and Profile

The official Omron HBF-514C manual, printed pages 8/31, reproduces Gallagher-derived reference bands. For a continuous unrounded estimate, use:

| Category | Age | Below reference | Within reference | High starts | Very high starts |
| --- | --- | --- | --- | --- | --- |
| Male | 20-39 | <8% | 8% to <20% | 20% | 25% |
| Male | 40-56 | <11% | 11% to <22% | 22% | 28% |
| Female | 20-39 | <21% | 21% to <33% | 33% | 39% |
| Female | 40-56 | <23% | 23% to <34% | 34% | 40% |

These are provisional BMI-linked references from different methods/populations, not universal diagnostic RFM cutoffs. Do not compare outside the source BMI <=35 scope, below age 20, or without a valid RFM estimate. A lower percentage is not necessarily healthier. Sources and uncertainty are available in a collapsed methodology section rather than flooding the main result.

Keep weight category separate from composition. Underweight/obesity summaries explicitly refer to BMI, not directly measured tissue. At normal BMI with RFM above the relevant reference, show **possible Skinny Fat**, never confirmed low muscle. A potential-athletic description additionally requires reported regular strength training, appropriate reference context and BMI below 30; circumferences do not prove athleticism. Normal reference results do not prove overall health. Raised midpoint WHtR is disclosed even with otherwise normal BMI/RFM, and is not summarized as overall balance.

Recommendations are general discussion directions: weight gain with individual guidance for underweight, strength/recomposition/maintenance where appropriate, and professional evaluation for raised risk or excess-weight/fat indicators. No automatic weight-loss recommendation at normal or low BMI, no goal/deficit/exercise overrides, and no muscle-mass estimate from circumferences.

Additional ratios are midpoint waist/hip, chest/midpoint waist, arm/height, thigh/height and wrist/height when their inputs exist. They are descriptive, without invented ideal-proportion or muscle thresholds.

## Interface and Persistence

Nutrition is primary in a single shared form. Activity and goal are explicitly required without defaults, alongside the five required body measurements and eligibility confirmation. `section#nutrition-details` is an ordinary noncollapsible section before waist; optional measurements remain collapsed. **Изчисли моите резултати** computes both outputs with one click and focuses nutrition output on success. The right pane always shows calorie and macro labels, with dashes until calculation; all macro and nutrient rows sit vertically there. Fiber/dietary fiber is one row. There is no body-only UI or nutrition-only reset.

The body model remains independent: a valid bonus can still be shown when nutrition hits support limits or a goal is missing. Missing required nutrition choices produces a focused error summary with linked field errors and does not save a valid shared submission; a body bonus is not a successful nutrition submission. Session-only drafts can retain pending edits. The original sidebar/central-input/right-output design is retained in Bulgarian. The bottom action opens the implemented `training.html` generator in the same tab with validated common inputs, never health data in URLs. Age, weight, goal and activity outside training are entered only on nutrition; training collects six specific settings. Valid BMI/energy-limited common profiles allow exercise without calorie days; all-paces-blocked shared profiles can explicitly retain `weeklyRate: ''`, not an invented selection.

Device remembering remains off by default. The unchanged key `liftfuel.profile.v1` now stores strict v6 normalized profile inputs, including distinct waists and optional circumferences; v6 marks activity outside planned training. Versions 1-5 still decode, but the UI clears legacy activity and requires explicit reselection, never reinterpretation. Legacy body-only records do not acquire invented nutrition choices. Version 3's waist restores only as midpoint; version 4's recorded site determines the field; versions 1/2 acquire no invented waists. Reported fat percentages or muscular descriptions never become RFM measurements or training self-report.

Automatic tab snapshots (`liftfuel.shared.session.v1`) and pending drafts survive within-tab navigation/reload; drafts are session-only. Explicit remember consent permits `liftfuel.shared.saved.v1` profile plus only environment, equipment, experience, days, duration and current training. Never persist eligibility, interpretations, percentages/masses, exercise results or calorie results. Fresh personal workout eligibility remains separate from nutrition eligibility. Unchanged inputs with renewed nutrition eligibility may preserve valid workout settings; relevant edits invalidate credits. Cross-tab revocation/replacement cannot resurrect stale data or consent, and storage failures must remain visible/truthful.

The automatic seven-day table on both pages does not derive energy from RFM or body type. Rest retains base nutrition; training adds only the nonaccumulative estimate above allocated outside-activity maintenance. Protein stays 2 g/kg daily, fat 25%, carbs remainder; kcal display rounds to nearest 10. Age 18 can exercise but training energy is unavailable; integration estimates support 19-56. Whole unsupported days are withheld, never clamped to 1500-4500. Exact method/sources and pending professional energy review: [TRAINING_ENERGY_POLICY.md](TRAINING_ENERGY_POLICY.md).

## Sources

- RFM equation, adult study and iliac-crest measurement protocol: https://www.nature.com/articles/s41598-018-29362-1
- Adult BMI categories and age scope: https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html
- NICE midpoint-waist measurement and WHtR interpretation: https://www.nice.org.uk/guidance/ng246/chapter/Identifying-and-assessing-overweight-obesity-and-central-adiposity
- Official Omron reference table, printed pages 8 and 31: https://omronhealthcare.com/storage/pdfs/1665708-0f_hbf-514c-z_e_m_web_alt_text_acc.pdf
- Gallagher et al. (2000), provisional body-fat ranges and methodological limitations: https://doi.org/10.1093/ajcn/72.3.694 ; https://pubmed.ncbi.nlm.nih.gov/10966886/
