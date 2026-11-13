document.documentElement.classList.replace('no-js','js');

/* Saubere Adresse: wer /seite.html oder /index.html aufruft, sieht in der
   Adresszeile /seite bzw. / (ohne Neuladen). Auf dem Live-Server erledigt
   das zusätzlich eine 301-Umleitung in der .htaccess. */
(function () {
  var p = location.pathname;
  if (!/\.html$/.test(p) || /\/404\.html$/.test(p)) return;
  var sauber = p.replace(/(^|\/)index\.html$/, "$1").replace(/\.html$/, "");
  try { history.replaceState(history.state, "", sauber + location.search + location.hash); } catch (e) {}
})();
