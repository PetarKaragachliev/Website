const reload = document.querySelector('#reload-app');
reload.addEventListener('click', () => window.location.reload());

import('./app.js?v=shared-results-1').catch(() => {
  document.querySelector('#analyze').disabled = true;
  const status = document.querySelector('#app-status');
  status.textContent = 'Неуспешно зареждане на калкулатора. Провери връзката и дали JavaScript е разрешен за този сайт, след което опитай отново. Данните не са изпратени.';
  status.hidden = false;
  reload.hidden = false;
});
