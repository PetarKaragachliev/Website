import { parseMetric } from './measurements.js';

export function validateBodyMeasurements(source) {
  source = source && typeof source === 'object' ? source : {};
  const errors = {};
  const body = {};
  for (const [field, min, max] of [
    ['waistRfm', 35, 200], ['waistWhtr', 35, 200], ['hip', 45, 220],
    ['chest', 45, 220], ['arm', 10, 85], ['thigh', 20, 140], ['wrist', 8, 35]
  ]) {
    const raw = source[field];
    const absent = raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '');
    body[field] = absent ? null : parseMetric(raw, min, max);
    if (body[field] === null && (field === 'waistRfm' || !absent)) {
      errors[field] = `Въведете обиколка от ${min} до ${max} см с най-много един знак след десетичната запетая. Това са входни ограничения, не здравословни граници.`;
    }
  }
  body.regularTraining = source.regularTraining === undefined ? false : source.regularTraining;
  if (typeof body.regularTraining !== 'boolean') errors.regularTraining = 'Посочете редовните тренировки само с булева стойност.';
  return { errors, body: Object.keys(errors).length ? null : body };
}

export function calculateBodyAssessment(input) {
  const source = input && typeof input === 'object' ? input : {};
  const age = parseMetric(source.age, 18, 56, true);
  const height = parseMetric(source.height, 130, 230);
  const weight = parseMetric(source.weight, 35, 250);
  const sex = source.sex;
  const { errors, body } = validateBodyMeasurements(source);
  if (age === null) errors.age = 'Въведете възраст от 18 до 56 навършени години като цяло число.';
  if (height === null) errors.height = 'Въведете ръст от 130 до 230 см с най-много един знак след десетичната запетая.';
  if (weight === null) errors.weight = 'Въведете тегло от 35 до 250 кг с най-много един знак след десетичната запетая.';
  if (sex !== 'male' && sex !== 'female') errors.sex = 'Изберете мъжки или женски пол за коефициента на формулата.';
  if (source.eligible !== true) errors.eligible = 'Потвърдете, че разбирате за кого е предназначен инструментът.';
  if (Object.keys(errors).length) return { errors, measurements: null, assessment: null };

  const bmi = weight / (height / 100) ** 2;
  const bmiCode = age < 20 ? 'unavailable' : bmi < 18.5 ? 'underweight' : bmi < 25 ? 'normal' : bmi < 30 ? 'overweight' : bmi < 35 ? 'obese1' : bmi < 40 ? 'obese2' : 'obese3';
  const bmiCategory = {
    code: bmiCode,
    label: {
      unavailable: 'Не се прилагат праговете за ИТМ на възрастни под 20 години',
      underweight: 'Поднормено тегло по ИТМ', normal: 'Нормално тегло по ИТМ',
      overweight: 'Наднормено тегло по ИТМ', obese1: 'Затлъстяване I степен по ИТМ',
      obese2: 'Затлъстяване II степен по ИТМ', obese3: 'Затлъстяване III степен по ИТМ'
    }[bmiCode],
    note: age < 20
      ? 'Числената стойност е показана описателно. На 18-19 години тук не се прилага тегловната класификация за възрастни; необходима е възрастово съобразена оценка.'
      : 'Категорията използва незакръгления ИТМ и праговете 18,5 / 25 / 30 / 35 / 40. Това е тегловна категория, не диагноза за действителната мастна или мускулна тъкан.'
  };

  const rawPercent = (sex === 'male' ? 64 : 76) - 20 * height / body.waistRfm;
  const rfm = age < 20
    ? { percent: null, reason: 'Цитираното проучване за RFM при възрастни не валидира 18-19 години; тук оценката е достъпна от 20 години.' }
    : rawPercent < 3 || rawPercent > 60
      ? { percent: null, reason: 'Резултатът е извън софтуерните граници 3-60%. Те не са здравословен диапазон. Оценката се скрива, а не се ограничава до крайна стойност; проверете талията на нивото на хълбочния гребен и потърсете индивидуална оценка.' }
      : { percent: rawPercent, reason: null };
  const fatMass = rfm.percent === null ? null : weight * rfm.percent / 100;
  const fatFreeMass = fatMass === null ? null : weight - fatMass;

  const midpoint = body.waistWhtr !== null;
  const whtrBand = bmi >= 35 ? 'outside-scope' : !midpoint ? 'descriptive-only'
    : body.waistWhtr / height < 0.4 ? 'below-range' : body.waistWhtr / height < 0.5 ? 'not-raised'
      : body.waistWhtr / height < 0.6 ? 'increased' : 'high';
  const whtrNotes = {
    'descriptive-only': 'Използвана е талията за RFM при хълбочния гребен само като описателен резервен вариант. Това не е измерване в средата между долното ребро и хълбочния гребен и не се прилагат диапазоните NICE.',
    'outside-scope': 'При ИТМ 35 или повече тук не се прилагат диапазоните NICE за талия/ръст; ниско съотношение не е доказателство за нисък риск.',
    'below-range': 'Талията в средата спрямо ръста е под 0,40, извън публикувания класификационен диапазон NICE. Проверете измерването; това не доказва здраве или ниски мазнини.',
    'not-raised': 'Талията в средата спрямо ръста е от 0,40 до под 0,50: без повишен показател според NICE. Това не доказва общо здраве или мускулна маса.',
    increased: 'Талията в средата спрямо ръста е от 0,50 до под 0,60: повишен риск, свързан с централно натрупване на мазнини според NICE, не диагноза.',
    high: 'Талията в средата спрямо ръста е 0,60 или повече: висок риск, свързан с централно натрупване на мазнини според NICE. Обсъдете със специалист; това не е диагноза.'
  };
  const whtr = {
    value: (body.waistWhtr ?? body.waistRfm) / height,
    source: midpoint ? 'midpoint' : 'rfm-fallback', band: whtrBand,
    note: whtrNotes[whtrBand] + (!midpoint && whtrBand === 'outside-scope' ? ` ${whtrNotes['descriptive-only']}` : '')
  };

  const proportions = [];
  const proportionDescription = 'Описателно съотношение без диагностични прагове; обиколките не установяват мускулна маса.';
  if (midpoint && body.hip !== null) proportions.push({ id: 'waist-hip', label: 'Талия/ханш', value: body.waistWhtr / body.hip, description: proportionDescription });
  if (midpoint && body.chest !== null) proportions.push({ id: 'chest-waist', label: 'Гръдна обиколка/талия', value: body.chest / body.waistWhtr, description: proportionDescription });
  for (const [field, label] of [['arm', 'Мишница/ръст'], ['thigh', 'Бедро/ръст'], ['wrist', 'Китка/ръст']]) {
    if (body[field] !== null) proportions.push({ id: `${field}-height`, label, value: body[field] / height, description: proportionDescription });
  }
  const proportionNote = (!midpoint && (body.hip !== null || body.chest !== null)
    ? 'За съотношенията талия/ханш и гръдна обиколка/талия добавете талия в средата между долното ребро и хълбочния гребен. Талията за RFM не я замества. '
    : '') + 'Пропорциите са само описателни, без прагове за телосложение или изводи за мускулна маса.';

  let reference = null;
  if (age >= 20 && bmi <= 35 && rfm.percent !== null) {
    const [low, high, veryHigh] = sex === 'male' ? (age < 40 ? [8, 20, 25] : [11, 22, 28]) : (age < 40 ? [21, 33, 39] : [23, 34, 40]);
    const band = rfm.percent < low ? 'low' : rfm.percent < high ? 'within' : rfm.percent < veryHigh ? 'high' : 'very-high';
    reference = {
      low, high, veryHigh, band,
      label: { low: 'Под референтния диапазон', within: 'В референтния диапазон', high: 'Над референтния диапазон', 'very-high': 'Силно над референтния диапазон' }[band],
      note: 'Условно сравнение с таблицата на производителя Omron HBF-514C, стр. 8/31, по Gallagher и сътр. (DOI: 10.1093/ajcn/72.3.694). Това са предварителни, свързани с ИТМ ориентири, не универсални диагностични прагове за RFM. Методите са различни: RFM е антропометрична оценка, а DXA е референтен метод в първичното изследване. Попадането в диапазона не доказва здраве, а стойност под него не е непременно по-здравословна.'
    };
  }

  const normalBmi = bmi >= 18.5 && bmi < 25;
  const raisedFat = reference?.band === 'high' || reference?.band === 'very-high';
  const lowerFat = reference?.band === 'within' || reference?.band === 'low';
  const code = age < 20 ? 'age-unavailable' : bmi < 18.5 ? 'underweight' : bmi >= 30 ? 'obesity'
    : rfm.percent === null ? 'insufficient-composition'
      : normalBmi && raisedFat ? 'possible-skinny-fat'
        : body.regularTraining && lowerFat && bmi < 30 ? 'potential-athletic'
          : reference?.band === 'low' && bmi < 25 ? 'slim'
            : normalBmi && reference?.band === 'within' ? 'balanced'
              : bmi >= 25 && bmi < 30 ? 'overweight' : 'insufficient-composition';
  const profiles = {
    'age-unavailable': {
      summary: 'Ограничена оценка на 18-19 години',
      explanation: 'Не се определя тип телосложение или тегловна категория за възрастни под 20 години. RFM и референтното сравнение не са налични.',
      recommendation: 'За индивидуални цели обсъдете възрастово съобразена оценка със специалист.'
    },
    underweight: {
      summary: 'Поднормено тегло по ИТМ',
      explanation: 'ИТМ е под 18,5. Тази тегловна категория има приоритет пред RFM и самооценката за тренировки; тя не измерва мускулна маса.',
      recommendation: 'Обсъдете безопасно покачване на теглото с квалифициран специалист, съобразено със здравето и храненето Ви.'
    },
    obesity: {
      summary: 'Тегловна категория затлъстяване по ИТМ',
      explanation: 'ИТМ е 30 или повече: това е тегловна категория, не диагноза за действителната тъканна маса или нейния състав. RFM, когато е наличен, остава приблизителна оценка.',
      recommendation: 'Потърсете квалифициран специалист за индивидуална оценка и подходяща цел, без автоматична промяна на хранене или тренировки.'
    },
    'insufficient-composition': {
      summary: 'Недостатъчна информация за телесния състав',
      explanation: 'Показана е само наличната тегловна категория по ИТМ, без категорично определяне на телосложение. Няма приложима оценка или референтно сравнение за състава.',
      recommendation: 'Проверете измерванията и обсъдете индивидуална оценка със специалист, преди да избирате промяна на теглото.'
    },
    'possible-skinny-fat': {
      summary: 'Възможно телосложение тип Skinny Fat',
      explanation: 'ИТМ е от 18,5 до под 25, а RFM е над условния референтен диапазон за пола и възрастта. Това не потвърждава ниска мускулна маса и не е диагноза.',
      recommendation: 'Обсъдете рекомпозиция и силови тренировки според опита и здравето Ви, а не автоматично отслабване.'
    },
    'potential-athletic': {
      summary: 'Потенциално атлетично телосложение (по самоотчет)',
      explanation: 'ИТМ е от 18,5 до под 30, RFM е в или под условния диапазон и са посочени редовни тренировки. Тренировките са самооценка, не доказателство от обиколките за атлетичност или мускулна маса.',
      recommendation: 'Обсъдете поддържане или индивидуално развитие на силата според целите и реалния тренировъчен опит, без автоматичен режим за теглото.'
    },
    slim: {
      summary: 'Слаб профил по условната оценка',
      explanation: 'ИТМ е от 18,5 до под 25, а RFM е под условния референтен диапазон. По-ниска стойност не означава непременно по-здравословен състав или достатъчно мускули.',
      recommendation: 'Обсъдете силови тренировки и индивидуален съвет за хранене и възстановяване, без автоматична цел за отслабване.'
    },
    balanced: {
      summary: 'Балансиран профил по наличните ориентири',
      explanation: 'ИТМ е от 18,5 до под 25, а RFM е в условния референтен диапазон. Това не представлява медицинско удостоверение за здраве и не измерва мускулна маса.',
      recommendation: 'Съобразете поддържането и развитието на силата с личните цели, здравето и проследяването във времето.'
    },
    overweight: {
      summary: 'Наднормено тегло по ИТМ',
      explanation: 'ИТМ е от 25 до под 30. Това е тегловна категория, не доказателство за излишна мастна тъкан; условната RFM оценка дава отделен, несигурен контекст.',
      recommendation: 'Обсъдете индивидуална цел със специалист; само ИТМ не е основание за автоматично отслабване.'
    }
  };
  const centralRaised = whtr.band === 'increased' || whtr.band === 'high';
  const profile = { ...profiles[code] };
  if (centralRaised) {
    if (code === 'balanced') profile.summary = 'Нормално тегло с повишен показател талия/ръст';
    profile.explanation += ' Отделната средна талия показва повишен централен показател по NICE, независимо от оценката RFM. Не приемайте останалите ориентири като доказателство за липса на риск; обсъдете със специалист.';
  }
  const recommendation = centralRaised && normalBmi && age >= 20
    ? 'Обсъдете подобряване на телесния състав, силови тренировки и оценка на централното натрупване със специалист, без автоматично отслабване при нормално тегло.'
    : bmi >= 25 && age >= 20 && raisedFat
    ? 'Обсъдете постепенно намаляване на мазнините с квалифициран специалист, особено при ИТМ 30 или повече. Това не променя автоматично калории, хранене или тренировки.'
    : profile.recommendation;
  const analysis = [
    bmiCategory.note,
    rfm.reason ?? 'RFM е приблизителна оценка, не пряко измерване. По-нисък процент не е автоматично по-здравословен.',
    whtr.note,
    reference ? `${reference.label}; сравнението е ориентировъчно, не диагноза или потвърждение за мускулна маса.` : 'Не се прави референтно сравнение при възраст под 20 години, ИТМ над 35 или липсваща RFM оценка.',
    `Налични са ${proportions.length} описателни съотношения. ${proportionNote}`,
    'Безмастната маса не е мускулна маса: включва вода, органи, кости и други тъкани. Изчислените маси наследяват грешката на RFM.'
  ];
  return {
    errors: {}, measurements: { age, sex, height, weight, body },
    assessment: {
      bmi, bmiCategory, rfm, fatMass, fatFreeMass, whtr, proportions, proportionNote,
      reference, code, summary: profile.summary, explanation: profile.explanation, analysis, recommendation
    }
  };
}
