const reloadWorkout = document.querySelector('#reload-workout');
reloadWorkout.addEventListener('click', () => window.location.reload());

let trainingLanguageView;
import('./language.js').then(module => {
  trainingLanguageView = module;
  module.initLanguage();
  return import('./training-app.js?v=language-1');
}).then(() => trainingLanguageView.localize()).catch(() => {
  document.querySelector('#generate-workout').disabled = true;
  const status = document.querySelector('#workout-load-status');
  status.textContent = 'Неуспешно зареждане на генератора. Провери връзката и дали JavaScript е разрешен за сайта, след което опитай отново. Настройките не са изпратени.';
  status.hidden = false;
  reloadWorkout.hidden = false;
  trainingLanguageView?.localize();
});
