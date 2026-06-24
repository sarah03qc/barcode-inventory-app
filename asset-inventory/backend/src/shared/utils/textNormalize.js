// Normaliza texto para comparaciones tolerantes a mayusculas,
// tildes y espacios extra. Usado para comparar nombres de sede
// que vienen con formato inconsistente desde el Excel institucional.
function normalizeText(text) {
  if (!text) return '';
  return String(text)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // elimina tildes
    .replace(/\s+/g, ' ')            // colapsa espacios multiples
    .trim();
}

// Lista de sedes que se consideran externas a Alajuela.
// Cualquier functional_center que contenga alguna de estas palabras
// se clasifica como externo. Si no contiene ninguna, se asume Alajuela
// (incluye casos ambiguos como "Aula 5" o "Lab 2" que no mencionan sede).
const OTHER_CAMPUSES = ['SAN JOSE', 'CARTAGO', 'SAN CARLOS', 'LIMON'];

// Determina si un functional_center corresponde a otra sede distinta
// de Alajuela, usando comparacion normalizada para evitar falsos
// negativos por tildes o capitalizacion inconsistente.
function isOtherCampus(functionalCenter) {
  const normalized = normalizeText(functionalCenter);
  return OTHER_CAMPUSES.some(campus => normalized.includes(campus));
}

module.exports = { normalizeText, isOtherCampus };