const crypto = require('crypto');
const { stolenPlates, wantedPersons } = require('../data/testData');

const samplePlates = ['ABC1D23','BRA2E45','XYZ3F67','JKL4G89','MNO5H10','PQR6J12'];
const samplePersons = wantedPersons.concat([
  { id: 'P-010', name: 'Ana Lima' },
  { id: 'P-011', name: 'Roberto Campos' },
  { id: 'P-012', name: 'Luiza Martins' }
]);

function randomPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function detectPlateFromImage(imageRef) {
  const hint = (imageRef || '').toUpperCase().replace(/[^A-Z0-9]/g,'');
  let plate = samplePlates.find(p => hint.includes(p)) || randomPick(samplePlates);
  const isFlagged = !!stolenPlates.find(s => s.plate === plate);
  return { plate, confidence: 0.92, flagged: isFlagged };
}

function detectPersonFromImage(imageRef) {
  const idx = Math.abs(crypto.createHash('md5').update(imageRef || Math.random().toString()).digest()[0]) % samplePersons.length;
  const person = samplePersons[idx];
  const flagged = !!wantedPersons.find(w => w.id === person.id);
  return { id: person.id, name: person.name, confidence: 0.90, flagged };
}

module.exports = { detectPlateFromImage, detectPersonFromImage };
