// Normaliza texto para comparaciones tolerantes a mayusculas,
// tildes y espacios. El dato real del Excel institucional viene
// con el texto completamente pegado y a veces con encoding roto
// en las tildes (ej: "CENTROACADÃ‰MICODEALAJUELA").
function normalizeText(text) {
  if (!text) return '';
  return String(text)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // elimina tildes
    .replace(/\s+/g, '')             // elimina todos los espacios
    .trim();
}

// Un activo se considera propio de Alajuela unicamente si su
// functional_center menciona explicitamente "Alajuela". Cualquier
// otro valor (otra sede, departamento central, activo no localizado,
// o escuela sin sede mencionada) se considera externo. Esta regla
// es intencionalmente estricta: es mas seguro asumir externo por
// defecto que asumir Alajuela incorrectamente.
function isOtherCampus(functionalCenter) {
  const normalized = normalizeText(functionalCenter);
  return !normalized.includes('ALAJUELA');
}

module.exports = { normalizeText, isOtherCampus };