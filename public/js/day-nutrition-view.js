const number = new Intl.NumberFormat('bg-BG', { maximumFractionDigits: 0 });

export function renderDayNutrition(container, output) {
  container.replaceChildren();
  container.hidden = !output.days.length;
  if (!output.days.length) return null;
  const note = document.createElement('p');
  note.textContent = 'Планирани дневни ориентири, не реално измерен разход. Добавката е само за съответната сесия след изваждане на базовия разход за същото време. Загрявката и охлаждането не получават калорийна добавка. Няма натрупване между дните. Ккал са закръглени до 10.';
  const table = document.createElement('table');
  table.className = 'reference-table day-nutrition-table';
  table.dataset.testid = 'weekly-nutrition';
  const caption = table.createCaption();
  caption.textContent = 'Седемдневни хранителни ориентири';
  const header = table.createTHead().insertRow();
  for (const label of ['Ден', 'Ккал', 'Белтъчини (г)', 'Мазнини (г)', 'Въглехидрати (г)', 'Добавка (ккал)']) {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = label;
    header.append(cell);
  }
  const body = table.createTBody();
  for (const day of output.days) {
    const row = body.insertRow();
    row.dataset.day = day.dayLabel;
    row.dataset.training = String(day.training);
    const label = document.createElement('th');
    label.scope = 'row';
    label.textContent = `${day.dayLabel} / ${day.training ? 'Тренировка' : 'Почивка'}`;
    row.append(label);
    for (const field of ['calories', 'protein', 'fat', 'carbs', 'extraCalories']) {
      const cell = row.insertCell();
      cell.dataset.dayField = field;
      cell.textContent = day[field] === null ? 'Няма оценка' : number.format(['calories', 'extraCalories'].includes(field) ? Math.round(day[field] / 10) * 10 : day[field]);
    }
  }
  // Keep the wide table inside its own viewport on narrow screens.
  const scroll = document.createElement('div');
  scroll.style.overflowX = 'auto';
  scroll.tabIndex = 0;
  scroll.setAttribute('role', 'region');
  scroll.setAttribute('aria-label', 'Седемдневни хранителни ориентири; превърти хоризонтално за всички показатели');
  scroll.append(table);
  container.append(note, scroll);
  if (output.days.some(day => day.limitation)) {
    const warning = document.createElement('p');
    warning.textContent = output.days.some(day => day.limitation === 'energy-age')
      ? 'На 18 години оценка за тренировъчния разход не е налична. Не е добавен измислен калориен кредит; тренировъчните дневни цели не се показват.'
      : 'Някои тренировъчни дневни цели не са налични поради ограниченията на оценката. Не са коригирани скрито.';
    container.append(warning);
  }
  return table;
}
