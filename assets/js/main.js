/* LV Kommunal Leasing – Navigation, Gebietskarte, Formular.
   Ohne JavaScript bleibt alles bedienbar: Untermenü offen, Karte und Kontakte sichtbar. */
(function () {
  "use strict";
  var $ = function (s, k) { return (k || document).querySelector(s); };
  var $$ = function (s, k) { return Array.prototype.slice.call((k || document).querySelectorAll(s)); };
  // Letztes Wort an das vorletzte binden, damit nie ein Wort allein in der Zeile steht
  function nb(t) { return String(t).replace(/ (\S+)$/, " $1"); }

  /* Menü */
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

  /* Gebietskarte */
  var NAMEN = { huelsen: "Ralf Hülsen", reintgen: "Sebastian Reintgen", nussbaum: "Ralf Nußbaum" };
  var svg = $(".karte-svg");
  if (svg) {
    var personen = $("#personen"), tip = $("#karte-tip"), meldung = $("#plz-meldung"), wrap = $("#karte");
    var fest = null;
    var zeige = function (gebiet, plz) {
      svg.classList.toggle("fokus", !!gebiet);
      personen.classList.toggle("fokus", !!gebiet);
      $$("path", svg).forEach(function (p) {
        p.classList.toggle("an", p.dataset.gebiet === gebiet);
        p.classList.toggle("treffer", !!plz && p.dataset.plz === plz);
      });
      $$(".person", personen).forEach(function (k) { k.classList.toggle("an", k.dataset.gebiet === gebiet); });
    };
    svg.addEventListener("pointermove", function (e) {
      var p = e.target.closest("path"); if (!p) return;
      var box = wrap.getBoundingClientRect();
      tip.textContent = "PLZ " + p.dataset.plz + " · " + NAMEN[p.dataset.gebiet];
      tip.style.left = (e.clientX - box.left) + "px";
      tip.style.top = (e.clientY - box.top) + "px";
      tip.classList.add("an");
      if (!fest) zeige(p.dataset.gebiet);
    });
    svg.addEventListener("pointerleave", function () {
      tip.classList.remove("an");
      if (fest) zeige(fest.gebiet, fest.plz); else zeige(null);
    });
    svg.addEventListener("click", function (e) {
      var p = e.target.closest("path"); if (!p) return;
      fest = { gebiet: p.dataset.gebiet, plz: p.dataset.plz };
      zeige(fest.gebiet, fest.plz);
      meldung.textContent = nb("PLZ-Bereich " + p.dataset.plz + ": Ihr Ansprechpartner ist " + NAMEN[fest.gebiet] + ".");
    });
    $("#plz-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var wert = ($("#plz").value || "").replace(/\D/g, "");
      if (wert.length < 2) { meldung.textContent = nb("Bitte mindestens die ersten zwei Ziffern eingeben."); return; }
      var p2 = wert.slice(0, 2);
      if (p2 === "11") p2 = "10"; // Postfachbereich Berlin
      var pfad = svg.querySelector('path[data-plz="' + p2 + '"]');
      if (!pfad) { meldung.textContent = nb("Diese Postleitzahl ist uns nicht bekannt. Rufen Sie uns gern direkt an."); zeige(null); fest = null; return; }
      fest = { gebiet: pfad.dataset.gebiet, plz: p2 };
      zeige(fest.gebiet, p2);
      meldung.textContent = nb("Für " + wert + " ist " + NAMEN[fest.gebiet] + " zuständig.");
    });
  }

  /* Formular (Vorschau) */
  var form = $("#anfrage");
  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    var m = $("#formular-meldung");
    m.hidden = false;
    m.textContent = form.checkValidity()
      ? nb("Vorschau: Das Formular ist noch nicht angebunden, es wurde nichts versendet.")
      : nb("Bitte Name und eine gültige E-Mail-Adresse angeben.");
  });

  var jahr = $("#jahr"); if (jahr) jahr.textContent = new Date().getFullYear();
})();
