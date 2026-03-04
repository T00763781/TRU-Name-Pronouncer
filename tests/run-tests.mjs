import { generateSyllableCandidates } from "../engine/index.js";

const cases = [
  "Trivedi",
  "Nguyen",
  "Ratnayake",
  "Quesada",
  "Deiveek"
];

let pass = 0;
for (const name of cases) {
  const res = generateSyllableCandidates(name);
  if (!res?.syllables?.length) {
    console.error("FAIL: no syllables for", name);
    process.exitCode = 1;
  } else {
    pass++;
  }
}
console.log(`OK: ${pass}/${cases.length} basic cases produced syllables`);
