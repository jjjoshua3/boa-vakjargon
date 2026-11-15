import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const sb = createClient("https://ofzyqwpztohflxdhqgbb.supabase.co", "sb_publishable_x8nU8ype6b1KOL6K8lS2Iw_DDjz4Olr");
const API = "https://systeem.boaportaal.nl/.netlify/functions";
const SITE = "jargon";
const TITEL = { feit: "Feitcodes", boom: "Beslisbomen", jargon: "Vakjargon", trainer: "Trainer" };
const UITLEG = {
  feit: "Hier pas je een feitcode aan die op boaportaal.nl staat. De akte en het Feitenboekje gaan voor op deze tekst.",
  boom: "Hier pas je een beslisboom aan. Het blijft een geheugensteun. De akte en de wet gaan voor.",
  jargon: "Hier pas je een begrip aan. Kort houden, en alleen wat klopt met de wet of het Feitenboekje.",
  trainer: "Hier pas je een oefenvraag, een beginsel of een casus aan. Het antwoord moet de wettekst blijven volgen.",
};
const ZOEK = {
  feit: "Zoek op code of titel, bijvoorbeeld D 517",
  boom: "Zoek een boom",
  jargon: "Zoek een begrip",
  trainer: "Zoek in deze lijst",
};
const MODUSNAAM = { vraag: "Vragen", beginsel: "Beginselen", casus: "Casussen" };
const app = document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"\']/g, (c) => ({"&": "&" + "amp;", "<": "&" + "lt;", ">": "&" + "gt;", '"': "&" + "quot;", "'": "&" + "#39;"}[c]));
let ik = null;
let bron = [];
let voorstellen = [];
let gekozen = null;
let modus = "vraag";
let fout = "";
let melding = "";
let zoek = "";

document.getElementById("kopregel").textContent = TITEL[SITE];
document.title = `${TITEL[SITE]} | Redactie`;

function sleutelVan(item, soort) {
  if (soort === "jargon" || soort === "beginsel") return item.term || item.titel;
  return item.id;
}

function labelVan(item, soort) {
  if (soort === "feit") return `${item.code || "Nieuw"} · ${item.titel || ""}`;
  if (soort === "jargon") return item.term || "Nieuw begrip";
  return item.titel || item.vraag || item.id || "Nieuw";
}

function leeg(soort) {
  if (soort === "feit") return { id: "", code: "", titel: "", artikel: "", domeinen: ["algemeen"], afdoening: "om", afdoeningLabel: "", kwalificatie: "", leeftijd: "", bijzonder: "", tarief: "", pv: "", trefwoorden: "" };
  if (soort === "boom") return { id: "", titel: "", domeinen: ["algemeen"], inleiding: "", start: "", nodes: [] };
  if (soort === "jargon") return { term: "", uitleg: "" };
  if (soort === "beginsel") return { titel: "", tekst: "" };
  if (soort === "casus") return { id: "", titel: "", domeinen: ["algemeen"], doel: "", setting: "", boa: "", burger: "", debrief: [], docent: "" };
  return { id: "", domeinen: ["algemeen"], rollen: ["boa"], soort: "rechtskennis", vraag: "", opties: ["", "", "", ""], juist: 0, toelichting: "", bron: "" };
}

function lijst() {
  if (SITE !== "trainer") return bron.map((item) => ({ soort: SITE, item }));
  const zak = { vraag: bron.vragen, beginsel: bron.beginselen, casus: bron.casussen };
  return (zak[modus] || []).map((item) => ({ soort: modus, item }));
}

function velden(soort, item) {
  const regels = (waarde) => (Array.isArray(waarde) ? waarde.join("\n") : waarde || "");
  const lijn = (waarde) => (Array.isArray(waarde) ? waarde.join(", ") : waarde || "");
  if (soort === "feit") return [
    ["code", "Feitcode", item.code], ["titel", "Titel", item.titel], ["artikel", "Artikel", item.artikel],
    ["domeinen", "Domeinen, met een komma", lijn(item.domeinen)], ["afdoening", "Afdoening", item.afdoening],
    ["afdoeningLabel", "Label", item.afdoeningLabel], ["kwalificatie", "Kwalificatie", item.kwalificatie],
    ["leeftijd", "Leeftijd", item.leeftijd, true], ["bijzonder", "Bijzonder", item.bijzonder, true],
    ["tarief", "Tarief", item.tarief, true], ["pv", "PV-tekst", item.pv, true], ["trefwoorden", "Trefwoorden", item.trefwoorden],
  ];
  if (soort === "jargon") return [["term", "Begrip", item.term], ["uitleg", "Uitleg", item.uitleg, true]];
  if (soort === "boom") return [
    ["titel", "Titel", item.titel], ["domeinen", "Domeinen, met een komma", lijn(item.domeinen)],
    ["inleiding", "Inleiding", item.inleiding, true], ["start", "Eerste stap (id)", item.start],
    ["nodes", "Stappen, als JSON", JSON.stringify(item.nodes || [], null, 2), true],
  ];
  if (soort === "beginsel") return [["titel", "Titel", item.titel], ["tekst", "Tekst", item.tekst, true]];
  if (soort === "casus") return [
    ["titel", "Titel", item.titel], ["domeinen", "Domeinen, met een komma", lijn(item.domeinen)],
    ["doel", "Doel", item.doel, true], ["setting", "Setting", item.setting, true],
    ["boa", "BOA", item.boa, true], ["burger", "Burger", item.burger, true],
    ["debrief", "Debrief, één zin per regel", regels(item.debrief), true], ["docent", "Docent", item.docent, true],
  ];
  return [
    ["vraag", "Vraag", item.vraag, true], ["opties", "Antwoorden, één per regel", regels(item.opties), true],
    ["juist", "Nummer van het goede antwoord, vanaf 1", String((Number(item.juist) || 0) + 1)],
    ["toelichting", "Toelichting", item.toelichting, true], ["bron", "Bron", item.bron || ""],
    ["domeinen", "Domeinen, met een komma", lijn(item.domeinen)], ["rollen", "Rollen, met een komma", lijn(item.rollen)],
    ["soort", "Soort: rechtskennis of gbt", item.soort],
  ];
}

function pak(form, soort, basis) {
  const f = new FormData(form);
  const tekst = (naam) => String(f.get(naam) || "").trim();
  const lijstVan = (naam) => tekst(naam).split(",").map((deel) => deel.trim()).filter(Boolean);
  const regels = (naam) => tekst(naam).split("\n").map((deel) => deel.trim()).filter(Boolean);
  if (soort === "feit") return { ...basis, code: tekst("code"), titel: tekst("titel"), artikel: tekst("artikel"), domeinen: lijstVan("domeinen"), afdoening: tekst("afdoening"), afdoeningLabel: tekst("afdoeningLabel"), kwalificatie: tekst("kwalificatie"), leeftijd: tekst("leeftijd"), bijzonder: tekst("bijzonder"), tarief: tekst("tarief"), pv: tekst("pv"), trefwoorden: tekst("trefwoorden"), id: basis.id || tekst("code").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) };
  if (soort === "jargon") return { term: tekst("term"), uitleg: tekst("uitleg") };
  if (soort === "boom") return { ...basis, titel: tekst("titel"), domeinen: lijstVan("domeinen"), inleiding: tekst("inleiding"), start: tekst("start"), nodes: JSON.parse(tekst("nodes") || "[]"), id: basis.id || tekst("titel").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) };
  if (soort === "beginsel") return { titel: tekst("titel"), tekst: tekst("tekst") };
  if (soort === "casus") return { ...basis, titel: tekst("titel"), domeinen: lijstVan("domeinen"), doel: tekst("doel"), setting: tekst("setting"), boa: tekst("boa"), burger: tekst("burger"), debrief: regels("debrief"), docent: tekst("docent"), id: basis.id || tekst("titel").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) };
  const opties = regels("opties");
  return { ...basis, vraag: tekst("vraag"), opties, juist: Math.max(0, Number(tekst("juist")) - 1), toelichting: tekst("toelichting"), bron: tekst("bron"), domeinen: lijstVan("domeinen"), rollen: lijstVan("rollen"), soort: tekst("soort") === "gbt" ? "gbt" : "rechtskennis", id: basis.id || `vraag-${Date.now().toString(36)}` };
}

async function api(body) {
  const { data } = await sb.auth.getSession();
  const res = await fetch(`${API}/redactie`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token || ""}` },
    body: JSON.stringify(body),
  });
  const uit = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(uit.fout || "Het verzoek is niet gelukt.");
  return uit;
}

function mag() {
  return Boolean(ik?.mag?.[SITE === "trainer" ? "trainer" : SITE]);
}

function bijVan(item, soort) {
  if (soort === "feit") return item.artikel || "";
  if (soort === "jargon") return String(item.uitleg || "").slice(0, 80);
  if (soort === "boom") return String(item.inleiding || "").slice(0, 80);
  if (soort === "vraag") return String(item.toelichting || "").slice(0, 80);
  return String(item.doel || item.tekst || "").slice(0, 80);
}

function kortVoorstel(rij) {
  if (rij.payload?.verwijderd) return "Voorstel om deze tekst van de site te halen.";
  const velden = ["code", "titel", "term", "vraag", "artikel", "tarief", "uitleg"];
  const stuk = velden.filter((naam) => rij.payload?.[naam]).map((naam) => String(rij.payload[naam]).replace(/\s+/g, " ").slice(0, 90));
  return stuk.slice(0, 2).join(" · ") || rij.sleutel;
}

function teken(zoekactief) {
  if (!ik) {
    app.innerHTML = `<p class="kicker">Alleen voor medewerkers</p><h1>${esc(TITEL[SITE])}</h1>
      <p class="sub">${esc(UITLEG[SITE])} Wat je hier opslaat, is een voorstel. Bezoekers zien het pas als de hoofdbeheerder het goedkeurt.</p>
      <div class="stappen"><div><b>1. Kies</b><span>Zoek de tekst die niet klopt, of begin een nieuwe.</span></div><div><b>2. Leg voor</b><span>Jij slaat het voorstel op. De site verandert nog niet.</span></div><div><b>3. Goedkeuren</b><span>De hoofdbeheerder keurt het hier goed of wijst het af.</span></div></div>
      <form id="in" class="kaart"><h2>Inloggen</h2><p class="sub">Met het zakelijke e-mailadres waarmee je ook op het portaal inlogt. Een Client-ID werkt hier niet.</p><label>Zakelijk e-mailadres<input name="email" type="email" required autocapitalize="none" autocomplete="username"></label><label>Wachtwoord<input type="password" name="password" required autocomplete="current-password"></label><button>Inloggen</button>${fout ? `<p class="fout">${esc(fout)}</p>` : ""}</form>`;
    document.getElementById("in").onsubmit = aanmelden;
    return;
  }
  if (!mag()) {
    app.innerHTML = `<p class="kicker">Geen toegang</p><h1>${esc(TITEL[SITE])}</h1><div class="kaart"><p>${esc(ik.pv_naam)} · ${esc(ik.client_id)} mag deze teksten niet wijzigen.</p><p class="sub">De hoofdbeheerder zet dat aan in systeem, bij Accounts, onder Redactierecht.</p></div>`;
    return;
  }
  const items = lijst().filter(({ item, soort }) => `${labelVan(item, soort)} ${bijVan(item, soort)}`.toLowerCase().includes(zoek.toLowerCase()));
  const wacht = voorstellen.filter((rij) => rij.status === "wacht");
  const gekozenSleutel = gekozen ? sleutelVan(gekozen.item, gekozen.soort) : "";
  app.innerHTML = `<p class="kicker">${ik.keuren ? "Hoofdbeheerder" : "Redactie"} · ${esc(ik.client_id)}</p><h1>${esc(TITEL[SITE])}</h1>
    <p class="sub">${esc(UITLEG[SITE])}</p>
    <div class="stappen"><div><b>1. Kies een tekst</b><span>${items.length} in deze lijst.</span></div><div><b>2. Pas aan en leg voor</b><span>De live site blijft de oude tekst tonen.</span></div><div><b>3. Goedkeuring</b><span>${wacht.length ? `${wacht.length} wacht${wacht.length === 1 ? "" : "en"} op de hoofdbeheerder.` : "Er ligt nu niets ter goedkeuring."}</span></div></div>
    ${fout ? `<p class="fout">${esc(fout)}</p>` : ""}${melding ? `<p class="ok">${esc(melding)}</p>` : ""}
    ${ik.keuren && wacht.length ? `<h2>Wacht op goedkeuring</h2>${wacht.map((rij) => `<article class="kaart wacht"><b>${esc(rij.titel)}</b><p class="sub">Voorgelegd door ${esc(rij.indiener)} · ${esc(rij.soort)}</p><p>${esc(kortVoorstel(rij))}</p><div class="rij"><button data-keur="${esc(rij.id)}" data-besluit="goed">Goedkeuren en op de site zetten</button><button class="sec" data-keur="${esc(rij.id)}" data-besluit="af">Afwijzen</button></div></article>`).join("")}` : ""}
    ${!ik.keuren && wacht.length ? `<div class="kaart wacht"><b>Jouw voorstellen</b><p class="sub">${wacht.length} ${wacht.length === 1 ? "wacht" : "wachten"} nog op de hoofdbeheerder. Tot die tijd ziet niemand ze op het portaal.</p></div>` : ""}
    ${SITE === "trainer" ? `<div class="rij" style="margin-bottom:12px">${Object.entries(MODUSNAAM).map(([naam, label]) => `<button class="${modus === naam ? "aan" : "sec"}" data-modus="${naam}" type="button">${label}</button>`).join("")}</div>` : ""}
    <div class="layout">
      <div class="kaart">
        <label>Zoeken<input id="zoek" value="${esc(zoek)}" placeholder="${esc(ZOEK[SITE])}"></label>
        <button id="nieuw" type="button">Nieuwe tekst</button>
        <div class="lijst">${items.map(({ item, soort }, index) => `<button type="button" data-index="${index}" class="${gekozenSleutel && gekozenSleutel === sleutelVan(item, soort) ? "aan" : ""}">${esc(labelVan(item, soort))}<small>${esc(bijVan(item, soort))}</small></button>`).join("") || `<p class="leeg">Niets met die woorden.</p>`}</div>
      </div>
      <div>${gekozen ? formulier(gekozen) : `<div class="kaart"><h2>Nog niets gekozen</h2><p class="sub">Kies links een bestaande tekst, of begin een nieuwe. Opslaan zet het nog niet op boaportaal.nl.</p></div>`}</div>
    </div>`;
  const veld = document.getElementById("zoek");
  const plek = veld.value.length;
  veld.oninput = (e) => { zoek = e.target.value; teken(true); };
  if (zoekactief) {
    veld.focus();
    veld.setSelectionRange(plek, plek);
  }
  document.getElementById("nieuw").onclick = () => { const soort = SITE === "trainer" ? modus : SITE; gekozen = { soort, item: leeg(soort), vers: true }; zoek = ""; teken(); };
  document.querySelectorAll("[data-index]").forEach((knop) => knop.onclick = () => { gekozen = items[Number(knop.dataset.index)]; teken(); });
  document.querySelectorAll("[data-modus]").forEach((knop) => knop.onclick = () => { modus = knop.dataset.modus; gekozen = null; teken(); });
  document.getElementById("bewaar")?.addEventListener("submit", bewaar);
  document.getElementById("weg")?.addEventListener("click", verwijder);
  document.querySelectorAll("[data-keur]").forEach((knop) => knop.onclick = () => keur(knop.dataset.keur, knop.dataset.besluit));
}

function formulier(keuze) {
  const regels = velden(keuze.soort, keuze.item).map(([naam, label, waarde, lang]) => `<label>${esc(label)}${lang ? `<textarea name="${esc(naam)}">${esc(waarde)}</textarea>` : `<input name="${esc(naam)}" value="${esc(waarde)}">`}</label>`).join("");
  return `<form id="bewaar" class="kaart"><p class="letop">Dit gaat nog niet live. De hoofdbeheerder moet het eerst goedkeuren.</p><h2>${esc(labelVan(keuze.item, keuze.soort))}</h2>${regels}<div class="rij"><button>Voorleggen ter goedkeuring</button>${keuze.vers ? "" : `<button id="weg" class="weg" type="button">Weghalen voorleggen</button>`}</div></form>`;
}

async function aanmelden(event) {
  event.preventDefault();
  fout = "";
  const f = new FormData(event.target);
  let email = String(f.get("email") || "").trim();
  if (/^BP-\d{4}-[A-Z]{2}$/i.test(email)) {
    fout = "Log in met het zakelijke adres. De Client-ID alleen is hier niet genoeg.";
    teken();
    return;
  }
  const { error } = await sb.auth.signInWithPassword({ email, password: String(f.get("password") || "") });
  if (error) { fout = "Aanmelden lukt niet."; teken(); return; }
  await start();
}

async function start() {
  try {
    ik = await api({ actie: "ik" });
    document.getElementById("uit").hidden = false;
    if (!mag()) { teken(); return; }
    const [bestand, live, wachtrij] = await Promise.all([
      fetch(SITE === "trainer" ? "/bron/trainer.json" : `/bron/${SITE}.json`).then((res) => res.json()),
      fetch(`${API}/inhoud`).then((res) => res.json()).catch(() => ({ regels: [] })),
      api({ actie: "lijst", soort: SITE }),
    ]);
    bron = bestand;
    pasLive(live.regels || []);
    voorstellen = wachtrij.voorstellen || [];
    teken();
  } catch (err) {
    fout = err.message;
    teken();
  }
}

function pasLive(regels) {
  const apply = (lijst, soort) => {
    const gezien = new Set(lijst.map((item) => sleutelVan(item, soort)));
    const bij = lijst.flatMap((item) => {
      const regel = regels.find((rij) => rij.soort === soort && rij.sleutel === sleutelVan(item, soort));
      if (!regel) return [item];
      if (regel.payload?.verwijderd) return [];
      return [{ ...item, ...regel.payload, id: item.id }];
    });
    for (const regel of regels) {
      if (regel.soort === soort && !gezien.has(regel.sleutel) && !regel.payload?.verwijderd) bij.push(regel.payload);
    }
    return bij;
  };
  if (SITE === "trainer") {
    bron = { vragen: apply(bron.vragen, "vraag"), beginselen: apply(bron.beginselen, "beginsel"), casussen: apply(bron.casussen, "casus") };
    return;
  }
  bron = apply(bron, SITE);
}

async function bewaar(event) {
  event.preventDefault();
  fout = "";
  melding = "";
  try {
    const payload = pak(event.target, gekozen.soort, gekozen.item);
    const sleutel = sleutelVan(payload, gekozen.soort);
    if (!sleutel || !(payload.titel || payload.term || payload.vraag || payload.code)) throw new Error("Vul in elk geval de naam of de vraag in.");
    await api({ actie: "voorstel", soort: gekozen.soort, sleutel, titel: labelVan(payload, gekozen.soort), payload, basis: gekozen.vers ? null : gekozen.item });
    melding = "Voorstel ligt bij de hoofdbeheerder. De site toont het nog niet.";
    gekozen = null;
    voorstellen = (await api({ actie: "lijst", soort: SITE })).voorstellen || [];
  } catch (err) {
    fout = err.message.includes("JSON") ? "De stappen zijn geen geldige JSON." : err.message;
  }
  teken();
}

async function verwijder() {
  fout = "";
  melding = "";
  try {
    await api({ actie: "voorstel", soort: gekozen.soort, sleutel: sleutelVan(gekozen.item, gekozen.soort), titel: `Weghalen: ${labelVan(gekozen.item, gekozen.soort)}`, payload: { verwijderd: true }, basis: gekozen.item });
    melding = "Het weghalen ligt bij de hoofdbeheerder.";
    gekozen = null;
  } catch (err) { fout = err.message; }
  teken();
}

async function keur(id, besluit) {
  fout = "";
  try {
    await api({ actie: "keur", id, besluit });
    melding = besluit === "goed" ? "Goedgekeurd. De site toont het nu." : "Afgewezen. De site blijft zoals hij was.";
    voorstellen = (await api({ actie: "lijst", soort: SITE })).voorstellen || [];
  } catch (err) { fout = err.message; }
  teken();
}

document.getElementById("uit").onclick = async () => { await sb.auth.signOut(); ik = null; location.reload(); };
const { data } = await sb.auth.getSession();
if (data.session) await start();
else teken();
