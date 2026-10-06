/* LV Kommunal Leasing – Seitenlogik
   Ohne JavaScript bleibt alles lesbar: Reiter zeigen dann alle Tafeln untereinander,
   Rechner und Schadenfall zeigen ihren Ausgangszustand. */
(function () {
  "use strict";

  var $ = function (s, k) { return (k || document).querySelector(s); };
  var $$ = function (s, k) { return Array.prototype.slice.call((k || document).querySelectorAll(s)); };

  // Letztes Wort an das vorletzte binden, damit nie ein Wort allein in der Zeile steht
  function nb(t) { return String(t).replace(/ (\S+)$/, " $1"); }

  /* ---------------------------------------------------------- Kopf */
  var kopf = $("#kopf");
  var hero = $(".hero");
  function kopfStand() {
    kopf.classList.toggle("oben", !!hero && window.scrollY < 40 && !kopf.classList.contains("menue-auf"));
  }
  window.addEventListener("scroll", kopfStand, { passive: true });
  kopfStand();

  var knopf = $(".menue-knopf");
  var nav = $("#nav");
  function menue(auf) {
    knopf.setAttribute("aria-expanded", String(auf));
    nav.classList.toggle("offen", auf);
    kopf.classList.toggle("menue-auf", auf);
    kopfStand();
  }
  knopf.addEventListener("click", function () { menue(knopf.getAttribute("aria-expanded") !== "true"); });
  $$("#nav a").forEach(function (a) { a.addEventListener("click", function () { menue(false); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") menue(false); });

  // aktiver Abschnitt in der Navigation
  var navLinks = $$("#nav a");
  if ("IntersectionObserver" in window) {
    var aktiv = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) { a.setAttribute("aria-current", String(a.getAttribute("href") === "#" + e.target.id)); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    navLinks.forEach(function (a) { var z = $(a.getAttribute("href")); if (z) aktiv.observe(z); });

    var auftritt = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("da"); auftritt.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    $$(".auftritt").forEach(function (el) { auftritt.observe(el); });
  } else {
    $$(".auftritt").forEach(function (el) { el.classList.add("da"); });
  }

  /* ---------------------------------------------------------- Reiter */
  var tabs = $$('[role="tab"]');
  function zeige(tab, fokus) {
    tabs.forEach(function (t) {
      var an = t === tab;
      t.setAttribute("aria-selected", String(an));
      t.tabIndex = an ? 0 : -1;
      $("#" + t.getAttribute("aria-controls")).hidden = !an;
    });
    if (fokus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { zeige(t); });
    t.addEventListener("keydown", function (e) {
      var n = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (n) { e.preventDefault(); zeige(tabs[(i + n + tabs.length) % tabs.length], true); }
    });
  });
  if (tabs.length) zeige(tabs[0]);

  /* ---------------------------------------------------------- Rechner */
  var MASCHINEN = [
    { name: "Geräteträger mit Mähausleger", von: 0, bis: 18.7, preis: 180000, weise: "sommer", einsatz: "Einsatz April bis Oktober" },
    { name: "Winterdienst-LKW mit Schneepflug", von: 19.6, bis: 34.9, preis: 160000, weise: "winter", einsatz: "Einsatz November bis März" },
    { name: "Kehrfahrzeug", von: 36.7, bis: 48.7, preis: 220000, weise: "gleich", einsatz: "Einsatz ganzjährig" },
    { name: "Saug- und Spülfahrzeug", von: 50.8, bis: 65.9, preis: 320000, weise: "gleich", einsatz: "Einsatz ganzjährig" },
    { name: "Kommunaltraktor", von: 67.7, bis: 75.5, preis: 110000, weise: "gleich", einsatz: "Einsatz ganzjährig, Anbaugeräte je Saison" },
    { name: "Kompaktkehrmaschine", von: 77.5, bis: 88.6, preis: 130000, weise: "gleich", einsatz: "Einsatz ganzjährig" },
    { name: "Geräteträger mit Schneepflug", von: 90, bis: 100, preis: 140000, weise: "winter", einsatz: "Einsatz November bis März" }
  ];
  var MONATE = ["Okt", "Nov", "Dez", "Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep"];
  // Index 0 = Oktober (Vertragsbeginn im Rechenbeispiel)
  var SAISON = {
    gleich: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    winter: [0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
    sommer: [1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]
  };
  var ZINS = 0.059;

  var form = $("#rechner-form");
  if (form) {
    var preis = $("#r-preis"), laufzeit = $("#r-laufzeit"), rest = $("#r-rest");
    var euro = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
    var monateEl = $("#monate");
    var balken = MONATE.map(function (m) {
      var w = document.createElement("div"); w.className = "monat";
      w.innerHTML = '<div class="monat-balken"><span class="linear"></span><span class="saison"></span></div><span class="monat-name">' + m + "</span>";
      monateEl.appendChild(w);
      return { linear: w.querySelector(".linear"), saison: w.querySelector(".saison") };
    });
    var gewaehlt = 1;
    var faerbung = $("#faerbung");

    function fuellung(r) { r.style.setProperty("--fuell", ((r.value - r.min) / (r.max - r.min)) * 100 + "%"); }

    function rechne() {
      var P = +preis.value, n = +laufzeit.value, R = P * (+rest.value) / 100, i = ZINS / 12;
      var weise = (form.querySelector('input[name="zahlweise"]:checked') || {}).value || "gleich";
      var plan = SAISON[weise];
      var barwert = P - R / Math.pow(1 + i, n);
      var linear = barwert * i / (1 - Math.pow(1 + i, -n));
      // Saisonrate: gleiche Barwertsumme, nur in Monaten mit Einsatz gezahlt
      var faktor = 0, anzahl = 0;
      for (var t = 1; t <= n; t++) {
        if (plan[(t - 1) % 12]) { faktor += 1 / Math.pow(1 + i, t); anzahl++; }
      }
      var rate = weise === "gleich" ? linear : barwert / faktor;
      var zahlungen = weise === "gleich" ? n : anzahl;

      $("#o-preis").textContent = euro.format(P) + " €";
      $("#o-laufzeit").textContent = n + " Monate";
      $("#o-rest").textContent = rest.value + " %";
      [preis, laufzeit, rest].forEach(fuellung);

      var pause = plan.filter(function (x) { return !x; }).length;
      $("#e-rate").textContent = euro.format(rate) + " €";
      $("#e-label").textContent = weise === "gleich" ? "Gleichmäßige Rate" : "Rate in den Einsatzmonaten";
      $("#e-zusatz").textContent = weise === "gleich"
        ? nb("Jeden Monat gleich, " + n + " Raten über die gesamte Laufzeit.")
        : nb("Statt " + euro.format(linear) + " € jeden Monat. " + ["", "Ein", "Zwei", "Drei", "Vier", "Fünf", "Sechs", "Sieben"][pause] + " Monate im Jahr ohne Rate.");
      var pille = $("#e-pille");
      pille.textContent = weise === "gleich" ? "12 Raten im Jahr" : pause + " Monate ratenfrei";
      $("#e-summe").textContent = euro.format(rate * zahlungen) + " €";
      $("#e-restwert").textContent = euro.format(R) + " €";

      var max = Math.max(rate, linear);
      balken.forEach(function (b, k) {
        b.linear.style.bottom = (linear / max) * 100 + "%";
        var h = plan[k] ? (rate / max) * 100 : 0;
        b.saison.style.height = h + "%";
        b.saison.classList.toggle("null", !plan[k]);
      });

      var m = MASCHINEN[gewaehlt];
      $("#rechner-anfrage").dataset.text =
        "Rechnung aus dem Ratenrechner: " + m.name + ", Anschaffung " + euro.format(P) + " € netto, " + n +
        " Monate, Restwert " + rest.value + " %, Zahlweise " + { gleich: "gleichmäßig", winter: "Winter (Nov bis Mär)", sommer: "Grünpflege (Apr bis Okt)" }[weise] + ".";
    }

    function waehle(idx, preisSetzen) {
      gewaehlt = idx;
      var m = MASCHINEN[idx];
      $$(".maschine").forEach(function (b, k) { b.setAttribute("aria-pressed", String(k === idx)); });
      faerbung.style.clipPath = "inset(-5% " + (100 - m.bis) + "% -5% " + m.von + "%)";
      $("#maschine-name").textContent = m.name;
      $("#maschine-einsatz").textContent = m.einsatz;
      if (preisSetzen) {
        preis.value = m.preis;
        var r = form.querySelector('input[value="' + m.weise + '"]'); if (r) r.checked = true;
      }
      rechne();
    }

    $$(".maschine").forEach(function (b, k) {
      var m = MASCHINEN[k];
      b.style.left = m.von + "%";
      b.style.width = (m.bis - m.von) + "%";
      b.title = m.name;
      b.addEventListener("click", function () { waehle(k, true); });
    });
    form.addEventListener("input", rechne);
    form.addEventListener("submit", function (e) { e.preventDefault(); });
    waehle(1, false);

    $("#rechner-anfrage").addEventListener("click", function () {
      var feld = $("#f-text");
      if (feld) feld.value = this.dataset.text || "";
      var thema = $("#f-thema"); if (thema) thema.selectedIndex = 0;
    });
  }

  /* ---------------------------------------------------------- Schadenfall */
  var FAELLE = {
    bedienung: { ja: true, titel: "Bedienfehler aller Art sind eingeschlossen.", text: "Auch Ungeschicklichkeit und leichte Fahrlässigkeit. Genau die Schäden, bei denen eine normale Kaskoversicherung oft abwinkt.", folge: ["Sofortreparatur bis 10.000 €", "Ersatzmaschine wird erstattet", "500 € Selbstbeteiligung"] },
    motor: { ja: true, titel: "Innere Betriebsschäden sind versichert.", text: "Motor- und Getriebeschäden zählen dazu. Bis 10.000 € darf sofort repariert werden, ohne auf einen Gutachter zu warten.", folge: ["Sofortreparatur bis 10.000 €", "Ersatzmaschine wird erstattet", "500 € Selbstbeteiligung"] },
    vandalismus: { ja: true, titel: "Böswilligkeit und Vandalismus sind versichert.", text: "Dazu gehören auch Bruchschäden an der Verglasung und unbefugter Gebrauch durch Betriebsfremde.", folge: ["Reparaturkosten und Material", "500 € Selbstbeteiligung"] },
    transport: { ja: true, titel: "Transporte sind mitversichert.", text: "Viele Schäden entstehen beim Verladen und auf dem Weg zum Einsatzort. Ausgenommen sind nur Seetransporte.", folge: ["Reparaturkosten und Material", "Bei Totalschaden: Zeitwert", "500 € Selbstbeteiligung"] },
    sturm: { ja: true, titel: "Sturm, Hagel, Frost und Eisgang sind versichert.", text: "Ebenso Hochwasser, Brand, Blitzschlag und alle unmittelbar von außen einwirkenden Ereignisse.", folge: ["Reparaturkosten und Material", "Ersatzmaschine wird erstattet"] },
    verschleiss: { ja: false, titel: "Verschleißteile sind nicht versichert.", text: "Bürsten, Schläuche, Filter und Gummibeläge nutzen sich im Betrieb ab. Das gehört zur Wartung. Folgeschäden durch Verschleiß sind dagegen versichert.", folge: ["Folgeschäden versichert", "Wartung optional im Mietvertrag"] }
  };
  var befund = $("#befund");
  $$(".fall").forEach(function (b) {
    b.addEventListener("click", function () {
      var f = FAELLE[b.dataset.fall];
      $$(".fall").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      befund.innerHTML =
        '<p class="befund-status ' + (f.ja ? "ja" : "nein") + '">' + (f.ja ? "Versichert" : "Nicht versichert") + "</p>" +
        "<h4>" + nb(f.titel) + "</h4><p>" + nb(f.text) + '</p><div class="befund-folge">' +
        f.folge.map(function (x) { return "<span>" + x + "</span>"; }).join("") + "</div>";
    });
  });

  /* ---------------------------------------------------------- Karte und PLZ */
  var NAMEN = { huelsen: "Ralf Hülsen", reintgen: "Sebastian Reintgen", nussbaum: "Ralf Nußbaum" };
  var svg = $(".karte-svg");
  var kontakte = $("#kontakte");
  var tip = $("#karte-tip");
  var meldung = $("#plz-meldung");
  var gesperrt = null;

  function hebeHervor(gebiet, plz2) {
    if (!svg) return;
    svg.classList.toggle("fokus", !!gebiet);
    kontakte.classList.toggle("fokus", !!gebiet);
    $$("path", svg).forEach(function (p) {
      p.classList.toggle("an", p.dataset.gebiet === gebiet);
      p.classList.toggle("treffer", !!plz2 && p.dataset.plz === plz2);
    });
    $$(".kontakt", kontakte).forEach(function (k) { k.classList.toggle("an", k.dataset.gebiet === gebiet); });
  }

  if (svg) {
    var wrap = $("#karte");
    svg.addEventListener("pointermove", function (e) {
      var p = e.target.closest("path"); if (!p) return;
      var box = wrap.getBoundingClientRect();
      tip.textContent = "PLZ " + p.dataset.plz + "… · " + NAMEN[p.dataset.gebiet];
      tip.style.left = (e.clientX - box.left) + "px";
      tip.style.top = (e.clientY - box.top) + "px";
      tip.classList.add("an");
      if (!gesperrt) hebeHervor(p.dataset.gebiet);
    });
    svg.addEventListener("pointerleave", function () {
      tip.classList.remove("an");
      if (gesperrt) hebeHervor(gesperrt.gebiet, gesperrt.plz); else hebeHervor(null);
    });
    svg.addEventListener("click", function (e) {
      var p = e.target.closest("path"); if (!p) return;
      gesperrt = { gebiet: p.dataset.gebiet, plz: p.dataset.plz };
      hebeHervor(gesperrt.gebiet, gesperrt.plz);
      meldung.textContent = nb("PLZ-Bereich " + p.dataset.plz + ": " + NAMEN[p.dataset.gebiet] + " ist für Sie da.");
    });

    $("#plz-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var wert = ($("#plz").value || "").replace(/\D/g, "");
      if (wert.length < 2) { meldung.textContent = nb("Bitte mindestens die ersten zwei Ziffern eingeben."); return; }
      var p2 = wert.slice(0, 2);
      if (p2 === "11") p2 = "10"; // Postfachbereich Berlin
      var pfad = svg.querySelector('path[data-plz="' + p2 + '"]');
      if (!pfad) { meldung.textContent = nb("Diese Postleitzahl kennen wir nicht. Rufen Sie uns gern direkt an."); hebeHervor(null); return; }
      gesperrt = { gebiet: pfad.dataset.gebiet, plz: p2 };
      hebeHervor(gesperrt.gebiet, p2);
      meldung.textContent = nb("Für " + wert + " ist " + NAMEN[gesperrt.gebiet] + " zuständig.");
    });
  }

  /* ---------------------------------------------------------- Formular (Vorschau) */
  var anfrage = $("#anfrage");
  if (anfrage) {
    anfrage.addEventListener("submit", function (e) {
      e.preventDefault();
      var m = $("#formular-meldung");
      if (!anfrage.checkValidity()) {
        m.hidden = false;
        m.textContent = nb("Bitte Name und eine gültige E-Mail-Adresse angeben.");
        return;
      }
      m.hidden = false;
      m.textContent = nb("Vorschau: Das Formular ist noch nicht angebunden, es wurde nichts versendet.");
    });
  }

  var jahr = $("#jahr"); if (jahr) jahr.textContent = new Date().getFullYear();
})();
