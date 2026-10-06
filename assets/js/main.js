/* LV Kommunal Leasing – Navigation und Formular.
   Ohne JavaScript bleibt alles bedienbar: Das Untermenü steht dann offen. */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  var knopf = $(".menue-knopf"), nav = $("#nav");
  function menue(auf) { knopf.setAttribute("aria-expanded", String(auf)); nav.classList.toggle("offen", auf); }
  if (knopf) knopf.addEventListener("click", function () { menue(knopf.getAttribute("aria-expanded") !== "true"); });

  $$(".nav-gruppe > button").forEach(function (b) {
    b.addEventListener("click", function () {
      var auf = b.getAttribute("aria-expanded") !== "true";
      b.setAttribute("aria-expanded", String(auf));
      b.parentNode.classList.toggle("offen", auf);
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (knopf) menue(false);
    $$(".nav-gruppe").forEach(function (g) { g.classList.remove("offen"); g.firstElementChild.setAttribute("aria-expanded", "false"); });
  });

  var form = $("#anfrage");
  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    var m = $("#formular-meldung");
    m.hidden = false;
    m.textContent = form.checkValidity()
      ? "Vorschau: Das Formular ist noch nicht angebunden, es wurde nichts versendet."
      : "Bitte Name und eine gültige E-Mail-Adresse angeben.";
  });

  var jahr = $("#jahr"); if (jahr) jahr.textContent = new Date().getFullYear();
})();
