export function getDailyGuidance({ age, sex, calories, protein }) {
  if (!Number.isInteger(age) || age < 18 || age > 56 || !['male', 'female'].includes(sex) || !Number.isFinite(calories) || calories < 1500 || calories > 4500 || !Number.isFinite(protein) || protein <= 0) {
    throw new RangeError('Daily guidance requires a supported age, reference category, calorie estimate, and protein amount.');
  }

  const female = sex === 'female';
  const teen = age === 18;
  const ods = 'https://ods.od.nih.gov/factsheets';
  const who = 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet';
  const dri = 'https://www.nationalacademies.org/read/10490/chapter/1';
  const fda = 'https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels';
  const nutrients = [
    { id: 'fiber', name: 'Fiber', value: calories * 14 / 1000, unit: 'g', kind: 'reference', basis: 'AI framework', note: 'Energy-based reference: 14 g per 1,000 kcal. Increase gradually with adequate fluids.', source: dri },
    { id: 'free-sugars', name: 'Free / added sugars', value: calories * 0.05 / 4, unit: 'g', kind: 'limit', basis: '5% energy limit', note: 'Daily kcal x 0.05 / 4. Uses the stricter WHO conditional free-sugar guideline. Free sugars include added sugars plus honey, syrups, and juice sugars; this is not a limit on intact-fruit or plain-milk sugars, nor an amount to aim for.', source: who },
    { id: 'saturated-fat', name: 'Saturated fat', value: calories * 0.1 / 9, unit: 'g', kind: 'limit', basis: 'WHO limit', note: 'Under 10% of energy. A ceiling, not a consumption target; individual advice can be stricter.', source: who },
    { id: 'cholesterol', name: 'Cholesterol', value: 300, unit: 'mg', kind: 'reference', basis: 'FDA Daily Value', note: 'FDA labeling reference, not required intake, a personalized target, or a universal maximum for every healthy person.', source: fda },
    { id: 'sodium', name: 'Sodium', value: 2300, unit: 'mg', kind: 'limit', basis: 'General limit', note: 'Less than 2,300 mg/day, not a required intake or a universal safety threshold. Heavy sweat losses can require individual advice. Sodium is not the same as salt.', source: 'https://www.nationalacademies.org/read/25353/chapter/2' },
    { id: 'potassium', name: 'Potassium', value: teen ? (female ? 2300 : 3000) : (female ? 2600 : 3400), unit: 'mg', kind: 'reference', basis: 'AI', note: 'Adequate Intake, not the FDA label Daily Value or a supplement dose. Kidney conditions and some medications require individual guidance.', source: `${ods}/Potassium-HealthProfessional/` },
    { id: 'vitamin-a', name: 'Vitamin A', value: female ? 700 : 900, unit: 'mcg RAE', kind: 'reference', basis: 'RDA', note: 'Retinol activity equivalents. This is total intake guidance, not a dose of preformed vitamin A supplements.', source: `${ods}/VitaminA-HealthProfessional/` },
    { id: 'vitamin-c', name: 'Vitamin C', value: teen ? (female ? 65 : 75) : (female ? 75 : 90), unit: 'mg', kind: 'reference', basis: 'RDA', note: 'Baseline reference; people who smoke need an additional 35 mg/day according to NIH ODS.', source: `${ods}/VitaminC-HealthProfessional/` },
    { id: 'calcium', name: 'Calcium', value: teen ? 1300 : (female && age >= 51 ? 1200 : 1000), unit: 'mg', kind: 'reference', basis: 'RDA', note: 'Age-specific total intake reference. More is not automatically better; do not treat this as a supplement dose.', source: `${ods}/Calcium-HealthProfessional/` },
    { id: 'iron', name: 'Iron', value: teen ? (female ? 15 : 11) : (female && age <= 50 ? 18 : 8), unit: 'mg', kind: 'reference', basis: 'RDA', note: 'Baseline mixed-diet reference; vegetarian requirements can be higher. Menstrual status and individual needs may differ. Do not self-prescribe iron supplements from this number.', source: `${ods}/Iron-HealthProfessional/` },
    { id: 'omega-3', name: 'Omega-3 (ALA)', value: female ? 1100 : 1600, unit: 'mg', kind: 'reference', basis: 'AI (ALA only)', note: 'Alpha-linolenic acid only, displayed in mg/day. Not an EPA/DHA, total fish-oil, or supplement-dose recommendation.', source: `${ods}/Omega3FattyAcids-HealthProfessional/` },
    { id: 'magnesium', name: 'Magnesium', value: teen ? (female ? 360 : 410) : (female ? (age <= 30 ? 310 : 320) : (age <= 30 ? 400 : 420)), unit: 'mg', kind: 'reference', basis: 'RDA', note: 'Total intake reference, not a supplement dose. The 350 mg/day supplemental upper limit does not apply to naturally occurring food magnesium.', source: `${ods}/Magnesium-HealthProfessional/` }
  ];

  return {
    nutrients,
    meals: {
      count: 4,
      intervalHours: 4,
      exampleTimes: ['08:00', '12:00', '16:00', '20:00'],
      caloriesPerMeal: calories / 4,
      proteinPerMeal: protein / 4
    }
  };
}
