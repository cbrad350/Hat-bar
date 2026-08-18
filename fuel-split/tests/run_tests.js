// Tests for the fuel-split logic. Run with: node run_tests.js (or ./run_tests.sh)
"use strict";
const zlib = require("zlib");
const FM = require("../match.js");
const { extractPdfText } = require("../pdf-text.js");

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error("FAIL: " + name); }
}
function eq(name, got, want) {
  check(name + " (got " + JSON.stringify(got) + ", want " + JSON.stringify(want) + ")",
    JSON.stringify(got) === JSON.stringify(want));
}

// ---------- CSV ----------
const csv = 'Date,Aircraft,From,To,"Passenger, Lead"\n06/03/2026,N45XX,KAUS,KASE,"Smith, John"\n\n06/05/2026,N45XX,KASE,KAUS,Jones\n';
const rows = FM.parseCSV(csv);
eq("csv row count", rows.length, 3);
eq("csv quoted header", rows[0][4], "Passenger, Lead");
eq("csv quoted comma field", rows[1][4], "Smith, John");

// ---------- column detection ----------
const cols = FM.detectColumns(["Date", "Aircraft", "From", "To", "Passenger, Lead"]);
eq("detect date", cols.date, 0);
eq("detect tail", cols.tail, 1);
eq("detect from", cols.from, 2);
eq("detect to", cols.to, 3);
eq("detect owner", cols.owner, 4);

const cols2 = FM.detectColumns(["Trip Date", "Dep Time", "Tail Number", "Origin", "Destination", "Client Name", "Pax Count"]);
eq("detect date not time", cols2.date, 0);
eq("detect tail 2", cols2.tail, 2);
eq("detect origin", cols2.from, 3);
eq("detect destination", cols2.to, 4);
eq("detect client not pax count", cols2.owner, 5);

// ---------- dates ----------
eq("date iso", FM.parseDateLoose("2026-06-03"), "2026-06-03");
eq("date us", FM.parseDateLoose("06/03/2026"), "2026-06-03");
eq("date us short year", FM.parseDateLoose("6/3/26"), "2026-06-03");
eq("date dd-mon", FM.parseDateLoose("3-Jun-2026"), "2026-06-03");
eq("date mon dd", FM.parseDateLoose("Jun 3, 2026"), "2026-06-03");
eq("date with time", FM.parseDateLoose("06/03/2026 14:30"), "2026-06-03");
eq("date garbage", FM.parseDateLoose("not a date"), null);
eq("date bad month", FM.parseDateLoose("13/45/2026"), null);

// ---------- normalization ----------
check("tails equal with dash", FM.tailsEqual("N-45XX", "n45xx"));
check("tails not equal", !FM.tailsEqual("N45XX", "N525CJ"));
check("empty tails not equal", !FM.tailsEqual("", ""));
check("airport K-prefix", FM.airportsEqual("KAUS", "AUS"));
check("airport exact", FM.airportsEqual("kase", "KASE"));
check("airport different", !FM.airportsEqual("KAUS", "KDAL"));
eq("date diff", FM.dateDiffDays("2026-06-03", "2026-06-05"), 2);

// ---------- invoice extraction ----------
const invoice = [
  "WORLD FUEL SERVICES",
  "Invoice Number: 88123456",
  "Invoice Date: 06/04/2026",
  "Delivery Date: 06/03/2026",
  "Aircraft Registration: N45XX",
  "Location: KASE  Aspen-Pitkin County",
  "Jet A  412.5 GAL @ 6.85",
  "Fuel subtotal $2,825.63",
  "Into-plane fee $85.00",
  "Taxes $214.12",
  "Invoice Total: $3,124.75",
].join("\n");
const f1 = FM.extractInvoiceFields(invoice, { knownTails: ["N45XX", "N525CJ"], knownAirports: ["KAUS", "KASE"] });
eq("inv tail", f1.tail, "N45XX");
eq("inv delivery date beats invoice date", f1.date, "2026-06-03");
eq("inv airport", f1.airport, "KASE");
eq("inv gallons", f1.gallons, 412.5);
eq("inv total picks invoice total", f1.total, 3124.75);
eq("inv number", f1.invoiceNumber, "88123456");

// No labels at all — falls back to generic patterns.
const f2 = FM.extractInvoiceFields("N525CJ fueled at KDAL 06/10/2026\n180.0 gallons\n$1,306.80", {});
eq("inv fallback tail", f2.tail, "N525CJ");
eq("inv fallback airport", f2.airport, "KDAL");
eq("inv fallback gallons", f2.gallons, 180);
eq("inv fallback total", f2.total, 1306.8);

// Known-airport search matches the 3-letter form in text.
const f3 = FM.extractInvoiceFields("Fuel ticket N45XX 06/07/2026 at AUS ramp\nTotal Due $900.00", { knownAirports: ["KAUS"] });
eq("inv known airport 3-letter", f3.airport, "KAUS");

// ---------- matching ----------
const legs = [
  { date: "2026-06-03", tail: "N45XX", from: "KAUS", to: "KASE", family: "Smith" },
  { date: "2026-06-05", tail: "N45XX", from: "KASE", to: "KAUS", family: "Smith" },
  { date: "2026-06-05", tail: "N525CJ", from: "KAUS", to: "KHOU", family: "Jones" },
  { date: "2026-06-10", tail: "N45XX", from: "KAUS", to: "KSDL", family: "Miller" },
];

// Exact date + departure airport → auto.
let m = FM.matchFuelToLegs({ date: "2026-06-03", tail: "N45XX", airport: "KAUS" }, legs);
eq("match exact leg", m.index, 0);
eq("match exact status", m.status, "auto");

// Fuel invoiced the day after a leg, at the arrival airport of leg 0 =
// departure airport of leg 1? KASE departure on 6/5, invoice dated 6/5.
m = FM.matchFuelToLegs({ date: "2026-06-05", tail: "N45XX", airport: "ASE" }, legs);
eq("match K-prefix airport leg", m.index, 1);
eq("match K-prefix status", m.status, "auto");

// Tail keeps the two same-day legs apart.
m = FM.matchFuelToLegs({ date: "2026-06-05", tail: "N525CJ", airport: "KAUS" }, legs);
eq("match tail disambiguates", m.index, 2);

// Day-late invoice with matching departure airport still lands.
m = FM.matchFuelToLegs({ date: "2026-06-11", tail: "N45XX", airport: "KAUS" }, legs);
eq("match day-late", m.index, 3);
eq("match day-late status", m.status, "auto");

// No airport parsed, unique candidate → auto with lower score.
m = FM.matchFuelToLegs({ date: "2026-06-10", tail: "N45XX", airport: "" }, legs);
eq("match no airport", m.index, 3);
eq("match no airport status", m.status, "auto");

// Wrong tail → unmatched.
m = FM.matchFuelToLegs({ date: "2026-06-03", tail: "N999ZZ", airport: "KAUS" }, legs);
eq("match wrong tail", m.status, "unmatched");

// Airport that contradicts both ends → review, not silent auto.
m = FM.matchFuelToLegs({ date: "2026-06-03", tail: "N45XX", airport: "KLAX" }, legs);
eq("match contradicting airport status", m.status, "review");

// Ambiguity: two same-tail legs on the same date, no airport → review.
const ambiguousLegs = [
  { date: "2026-06-03", tail: "N45XX", from: "KAUS", to: "KASE", family: "Smith" },
  { date: "2026-06-03", tail: "N45XX", from: "KASE", to: "KAUS", family: "Jones" },
];
m = FM.matchFuelToLegs({ date: "2026-06-03", tail: "N45XX", airport: "" }, ambiguousLegs);
eq("match ambiguous status", m.status, "review");

// ---------- statement ----------
const fuel = [
  { date: "2026-06-03", tail: "N45XX", airport: "KAUS", gallons: 400, total: 3000, invoiceNumber: "A1", matchIndex: 0 },
  { date: "2026-06-05", tail: "N45XX", airport: "KASE", gallons: 350, total: 2900, invoiceNumber: "A2", matchIndex: 1 },
  { date: "2026-06-05", tail: "N525CJ", airport: "KAUS", gallons: 180, total: 1300, invoiceNumber: "B1", matchIndex: 2 },
  { date: "2026-07-01", tail: "N45XX", airport: "KAUS", gallons: 100, total: 800, invoiceNumber: "C1", matchIndex: -1 },
  { date: "2026-06-10", tail: "N45XX", airport: "KAUS", gallons: 50, total: 400, invoiceNumber: "D1", matchIndex: 3, familyOverride: "Davis" },
];
const st = FM.buildStatement(fuel, legs, null);
eq("stmt smith total", st.families["Smith"].total, 5900);
eq("stmt jones total", st.families["Jones"].total, 1300);
eq("stmt override wins", st.families["Davis"].total, 400);
eq("stmt unmatched goes unassigned", st.families["Unassigned"].total, 800);
eq("stmt line count", st.lines.length, 5);
check("stmt lines sorted", st.lines[0].date <= st.lines[st.lines.length - 1].date);

const stJune = FM.buildStatement(fuel, legs, "2026-06");
eq("stmt month filter", stJune.lines.length, 4);
check("stmt month excludes july", !stJune.families["Unassigned"]);

const csvOut = FM.statementCSV(st);
check("csv has header", csvOut.startsWith("Date,Family,Tail"));
check("csv has smith rollup", csvOut.includes("Smith,2,750,5900.00"));

// ---------- PDF extraction (synthetic Flate-compressed PDF) ----------
function buildPdf(text) {
  const lines = text.split("\n");
  let content = "BT /F1 10 Tf 40 700 Td\n";
  for (const line of lines) {
    content += "(" + line.replace(/([\\()])/g, "\\$1") + ") Tj 0 -14 Td\n";
  }
  content += "ET";
  const deflated = zlib.deflateSync(Buffer.from(content, "latin1"));
  const parts = [];
  parts.push(Buffer.from("%PDF-1.4\n"));
  parts.push(Buffer.from("1 0 obj\n<< /Length " + deflated.length + " /Filter /FlateDecode >>\nstream\n"));
  parts.push(deflated);
  parts.push(Buffer.from("\nendstream\nendobj\n%%EOF\n"));
  return Buffer.concat(parts);
}

async function pdfTests() {
  if (typeof DecompressionStream === "undefined") {
    console.log("(skipping PDF tests: no DecompressionStream in this node)");
    return;
  }
  const pdf = buildPdf(invoice);
  const res = await extractPdfText(pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength));
  check("pdf extract ok", res.ok);
  check("pdf keeps tail", res.text.includes("N45XX"));
  check("pdf keeps total", res.text.includes("3,124.75"));
  const f = FM.extractInvoiceFields(res.text, { knownTails: ["N45XX"], knownAirports: ["KASE"] });
  eq("pdf roundtrip date", f.date, "2026-06-03");
  eq("pdf roundtrip total", f.total, 3124.75);
  eq("pdf roundtrip gallons", f.gallons, 412.5);

  const notPdf = await extractPdfText(new TextEncoder().encode("hello world").buffer);
  check("non-pdf rejected", !notPdf.ok);

  // A PDF with no text layer (empty content) reports a scan, not garbage.
  const empty = Buffer.from("%PDF-1.4\n%%EOF\n");
  const res2 = await extractPdfText(empty.buffer.slice(empty.byteOffset, empty.byteOffset + empty.byteLength));
  check("scan-like pdf rejected", !res2.ok);
}

pdfTests().then(() => {
  console.log(pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
});
