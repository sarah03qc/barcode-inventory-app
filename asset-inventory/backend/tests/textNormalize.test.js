const { normalizeText, isOtherCampus } = require('../src/shared/utils/textNormalize');

describe('normalizeText', () => {
  test('convierte a mayusculas', () => {
    expect(normalizeText('alajuela')).toBe('ALAJUELA');
  });

  test('elimina tildes', () => {
    expect(normalizeText('CENTRO ACADÉMICO')).toBe('CENTROACADEMICO');
  });

  test('elimina todos los espacios, no solo los colapsa', () => {
    expect(normalizeText('SAN  CARLOS')).toBe('SANCARLOS');
    expect(normalizeText('SAN JOSE')).toBe('SANJOSE');
  });

  test('quita espacios al inicio y al final', () => {
    expect(normalizeText('  ALAJUELA  ')).toBe('ALAJUELA');
  });

  test('retorna string vacio para null o undefined', () => {
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
  });

  test('retorna string vacio para string vacio', () => {
    expect(normalizeText('')).toBe('');
  });

  test('maneja texto ya pegado del Excel institucional', () => {
    expect(normalizeText('CENTROACADÃ‰MICODEALAJUELA(F.ESPECIFICOS)'))
      .toContain('ALAJUELA');
  });
});

describe('isOtherCampus', () => {
  test('false cuando el texto menciona Alajuela en mayusculas simples', () => {
    expect(isOtherCampus('CENTRO ACADEMICO DE ALAJUELA')).toBe(false);
  });

  test('false cuando el texto menciona Alajuela pegado y sin tilde', () => {
    expect(isOtherCampus('CENTROACADEMICODEALAJUELA(F.ESPECIFICOS)')).toBe(false);
  });

  test('false cuando el texto menciona Alajuela con tilde rota del Excel', () => {
    expect(isOtherCampus('CENTROACADÃ‰MICODEALAJUELA')).toBe(false);
  });

  test('false cuando Alajuela aparece en minuscula', () => {
    expect(isOtherCampus('centro academico de alajuela')).toBe(false);
  });

  test('true para San Jose explicito', () => {
    expect(isOtherCampus('DIRECCIONCAMPUSTECNOLOGICOLOCALSANJOSE')).toBe(true);
  });

  test('true para San Carlos explicito', () => {
    expect(isOtherCampus('BACH.INGENIERIAENCOMPUTACIONSANCARLOS')).toBe(true);
  });

  test('true para Cartago explicito', () => {
    expect(isOtherCampus('UNIDADDELALMACENCAMPUSSANCARLOS')).toBe(true);
  });

  test('true para departamentos centrales sin mencion de sede', () => {
    expect(isOtherCampus('DATIC')).toBe(true);
    expect(isOtherCampus('AUDITORIAINTERNA')).toBe(true);
    expect(isOtherCampus('DIRECCIONDERECTORIA')).toBe(true);
  });

  test('true para escuelas sin sede explicita en el nombre', () => {
    expect(isOtherCampus('ESCUELADEFISICA')).toBe(true);
    expect(isOtherCampus('ESCUELADEQUIMICA')).toBe(true);
    expect(isOtherCampus('ESCUELADEMATEMATICA')).toBe(true);
  });

  test('true para el valor especial de activos no localizados', () => {
    expect(isOtherCampus('ACTIVOSNOLOCALIZADOS')).toBe(true);
  });

  test('true cuando functional_center es null, nunca debe asumirse Alajuela por defecto', () => {
    expect(isOtherCampus(null)).toBe(true);
  });

  test('true cuando functional_center es string vacio', () => {
    expect(isOtherCampus('')).toBe(true);
  });
});