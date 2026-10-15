/* LV Kommunal Leasing – Navigation, Gebietskarte, Formular.
   Ohne JavaScript bleibt alles bedienbar: Untermenü offen, Karte und Kontakte sichtbar. */
(function () {
  "use strict";
  var $ = function (s, k) { return (k || document).querySelector(s); };
  var $$ = function (s, k) { return Array.prototype.slice.call((k || document).querySelectorAll(s)); };
  // Letztes Wort an das vorletzte binden, damit nie ein Wort allein in der Zeile steht
  function nb(t) { return String(t).replace(/ (\S+)$/, " $1"); }

  /* Kopf: transparent über dem Fotokopf, weiß nach dem Scrollen */
  var kopf = $(".kopf");
  function kopfStand() { kopf.classList.toggle("oben", !!$(".hero") && window.scrollY < 40 && !kopf.classList.contains("menue-auf")); }
  window.addEventListener("scroll", kopfStand, { passive: true });
  kopfStand();

  /* Menü */
  var knopf = $(".menue-knopf"), nav = $("#nav");
  function menue(auf) { knopf.setAttribute("aria-expanded", String(auf)); nav.classList.toggle("offen", auf); kopf.classList.toggle("menue-auf", auf); kopfStand(); }
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

  /* Anfrage-Funnel (Kontaktseite)
     Ohne JavaScript stehen alle Stufen untereinander und das Formular funktioniert als Ganzes. */
  var funnel = $("#funnel");
  if (funnel) {
    var form = $("#anfrage");
    var stufen = $$(".stufe", form);
    var weiter = $("#funnel-weiter"), zurueck = $("#funnel-zurueck"), senden = $("#funnel-senden");
    var NAMEN_STUFE = ["Für wen", "Anliegen", "Maschine", "Eckdaten", "Kontakt"];
    var WER = { "Kommune oder öffentliche Einrichtung": "kommune", "Dienstleister oder Betrieb": "betrieb", "Händler oder Hersteller": "haendler", "Etwas anderes": "anders" };
    var akt = 1, zeiger = false;
    funnel.classList.add("funnel-an");

    var wert = function (n) { var e = form.querySelector('input[name="' + n + '"]:checked'); return e ? e.value : ""; };
    var werte = function (n) { return $$('input[name="' + n + '"]:checked', form).map(function (e) { return e.value; }); };
    var wer = function () { return WER[wert("wer")] || ""; };
    var zweig = function () { return wer() === "haendler" ? "haendler" : "kunde"; };
    var reihe = function () { return wer() === "anders" ? [1, 2, 5] : [1, 2, 3, 4, 5]; };

    function varianten() {
      var w = wer(), z = zweig();
      $$('.stufe[data-stufe="2"] .variante-feld', form).forEach(function (v) {
        v.hidden = v.getAttribute("data-fuer") !== w;
        if (v.hidden) $$("input", v).forEach(function (i) { i.checked = false; });
      });
      $$('.stufe[data-stufe="4"] .variante-feld', form).forEach(function (v) { v.hidden = v.getAttribute("data-fuer") !== z; });
      $$("[data-fuer-text]", form).forEach(function (t) { t.hidden = t.getAttribute("data-fuer-text") !== z; });
    }

    function zeige(n, fokus) {
      akt = n;
      var r = reihe(), idx = r.indexOf(n);
      stufen.forEach(function (s) { s.hidden = Number(s.getAttribute("data-stufe")) !== n; });
      $$(".funnel-schritte li", funnel).forEach(function (li) {
        var s = Number(li.getAttribute("data-s")), i = r.indexOf(s);
        li.setAttribute("data-status", i < 0 ? "aus" : i < idx ? "fertig" : i === idx ? "aktiv" : "offen");
      });
      $("#funnel-balken").style.width = (idx / (r.length - 1) * 100) + "%";
      zurueck.hidden = idx === 0;
      weiter.hidden = n === 5;
      senden.hidden = n !== 5;
      $("#funnel-status").textContent = "Schritt " + (idx + 1) + " von " + r.length + ": " + NAMEN_STUFE[n - 1];
      if (fokus) {
        var leg = stufen[n - 1].querySelector("legend");
        leg.setAttribute("tabindex", "-1");
        leg.focus({ preventScroll: true });
        var oben = funnel.getBoundingClientRect().top;
        if (oben < 0 || oben > window.innerHeight * .5) funnel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    function pruefe(n) {
      var ok = true, erstes = null;
      if (n === 1) ok = !!wert("wer");
      if (n === 2) ok = !!wert("anliegen");
      if (n === 3) ok = werte("maschine").length > 0;
      if (n === 5) {
        var name = $("#f-name"), mail = $("#f-mail");
        var nOk = !!name.value.trim(), mOk = !!mail.value.trim() && mail.checkValidity();
        name.setAttribute("aria-invalid", String(!nOk));
        mail.setAttribute("aria-invalid", String(!mOk));
        ok = nOk && mOk;
        erstes = !nOk ? name : !mOk ? mail : null;
      }
      var f = stufen[n - 1].querySelector(".stufe-fehler");
      if (f) { f.hidden = ok; f.setAttribute("role", "alert"); }
      if (!ok) (erstes || stufen[n - 1].querySelector("input")).focus();
      return ok;
    }

    function naechste() { var r = reihe(); return r[Math.min(r.indexOf(akt) + 1, r.length - 1)]; }
    function vorige() { var r = reihe(); return r[Math.max(r.indexOf(akt) - 1, 0)]; }

    weiter.addEventListener("click", function () { if (pruefe(akt)) zeige(naechste(), true); });
    zurueck.addEventListener("click", function () { zeige(vorige(), true); });

    /* Mit Maus oder Finger geht es nach einer Einzelauswahl direkt weiter, mit der Tastatur nicht */
    form.addEventListener("pointerdown", function () { zeiger = true; });
    form.addEventListener("keydown", function () { zeiger = false; });
    form.addEventListener("change", function (e) {
      var n = e.target.name;
      if (n === "wer") varianten();
      if (n === "wer" || n === "anliegen") {
        var f = stufen[akt - 1].querySelector(".stufe-fehler"); if (f) f.hidden = true;
        if (zeiger) setTimeout(function () { zeige(naechste(), true); }, 260);
      }
      zeiger = false;
      angaben();
    });
    form.addEventListener("input", function (e) { if (e.target.id === "f-plz") zustaendig(); angaben(); });

    /* Zusammenfassung in der Seitenspalte */
    function angaben() {
      var z = zweig(), zeilen = [
        ["Für wen", wert("wer")], ["Anliegen", wert("anliegen")],
        [z === "haendler" ? "Sie verkaufen" : "Maschine", werte("maschine").join(", ")],
        ["Modell", $("#f-modell").value.trim()],
        z === "haendler" ? ["Jahresumsatz", wert("umsatz")] : ["Anschaffung", wert("wert")],
        z === "haendler" ? ["Finanzierte Verkäufe", wert("stueck")] : ["Laufzeit", wert("laufzeit")],
        ["Saisonrate", z === "haendler" ? "" : wert("saison")], ["Start", wert("zeitpunkt")], ["Rückruf", wert("rueckruf")]
      ].filter(function (x) { return x[1]; });
      if (!zeilen.length) zeilen = [["Für wen", "noch offen"]];
      $("#angaben-liste").innerHTML = zeilen.map(function (x) {
        return "<div><dt>" + x[0] + "</dt><dd>" + x[1].replace(/[<>&]/g, "") + "</dd></div>";
      }).join("");
    }

    /* Ansprechpartner aus der Gebietskarte nach Postleitzahl */
    function person() {
      var plz = ($("#f-plz").value || "").replace(/\D/g, ""), karte = $(".karte-svg"), g = "alle";
      if (plz.length >= 2 && karte) {
        var p2 = plz.slice(0, 2) === "11" ? "10" : plz.slice(0, 2);
        var pfad = karte.querySelector('path[data-plz="' + p2 + '"]');
        if (pfad) g = pfad.getAttribute("data-gebiet");
      }
      return { plz: plz, el: $('.person[data-gebiet="' + g + '"]') };
    }
    function zustaendig() {
      var p = person(), h = $("#f-plz-hinweis");
      if (p.plz.length < 5 || !p.el) { h.textContent = "Mit der Postleitzahl sehen Sie, wer für Sie zuständig ist."; return; }
      h.innerHTML = "<strong>" + p.el.querySelector("h3").textContent + "</strong> ist für " + p.plz + " zuständig.";
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (akt !== 5) { if (pruefe(akt)) zeige(naechste(), true); return; }
      if (!pruefe(5)) return;
      var p = person(), fertig = $("#funnel-fertig");
      $("#fertig-person").innerHTML = p.el
        ? '<p class="lead">' + nb("Ihre Anfrage geht an " + p.el.querySelector("h3").textContent + ". Sie hören in Kürze von uns.") + '</p><div class="personen">' + p.el.outerHTML + "</div>"
        : "";
      form.hidden = true;
      $$(".funnel-kopf .funnel-schritte li", funnel).forEach(function (li) { if (li.getAttribute("data-status") !== "aus") li.setAttribute("data-status", "fertig"); });
      $("#funnel-balken").style.width = "100%";
      fertig.hidden = false;
      fertig.focus();
    });

    /* Vorbelegung über die Adresse, zum Beispiel kontakt?wer=kommune */
    var vor = new URLSearchParams(location.search).get("wer");
    var vorWert = Object.keys(WER).filter(function (k) { return WER[k] === vor; })[0];
    if (vorWert) {
      form.querySelector('input[name="wer"][value="' + vorWert + '"]').checked = true;
      varianten(); angaben(); zeige(2, false);
    } else {
      varianten(); zeige(1, false);
    }
  }

  var jahr = $("#jahr"); if (jahr) jahr.textContent = new Date().getFullYear();
})();
