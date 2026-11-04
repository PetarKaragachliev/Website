# Body Analyzer

Status: Bulgarian development-preview analyzer; professional content/body-composition review remains a release gate. All inputs are metric. Software support is ages 18-56, height 130-230 cm, weight 35-250 kg; entry bounds are not healthy ranges.

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

The central analyzer requires no nutrition goal/activity. Optional measurements and nutrition choices are collapsed sections. Dietary output is calculated only after explicit activity and goal choices; all macro and nutrient rows sit vertically in the right pane. Fiber/dietary fiber is one row. Users can clear only nutrition choices without resetting body inputs. The original sidebar/central-input/right-output design is retained in Bulgarian. The bottom action opens the separate `training.html` page in the same browser tab, with a return link: it is an honest placeholder, not a workout generator or a channel for health data in URLs.

Device remembering remains off by default. The unchanged key `liftfuel.profile.v1` now stores strict version-5 normalized inputs, with two distinct waists and optional circumferences. No eligibility, interpretation, calculated percentage or mass is persisted. Version 3's old waist restores only as midpoint; version 4's recorded site determines the correct new field. Versions 1/2 do not acquire invented waists. Previously reported fat percentages or muscular self-descriptions do not become RFM measurements or reported training. Recalculation requires fresh eligibility confirmation. Data is not rewritten until consented analysis.

## Sources

- RFM equation, adult study and iliac-crest measurement protocol: https://www.nature.com/articles/s41598-018-29362-1
- Adult BMI categories and age scope: https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html
- NICE midpoint-waist measurement and WHtR interpretation: https://www.nice.org.uk/guidance/ng246/chapter/Identifying-and-assessing-overweight-obesity-and-central-adiposity
- Official Omron reference table, printed pages 8 and 31: https://omronhealthcare.com/storage/pdfs/1665708-0f_hbf-514c-z_e_m_web_alt_text_acc.pdf
- Gallagher et al. (2000), provisional body-fat ranges and methodological limitations: https://doi.org/10.1093/ajcn/72.3.694 ; https://pubmed.ncbi.nlm.nih.gov/10966886/
