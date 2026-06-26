const ExcelJS = require('exceljs');
const parseExcel = require('../src/shared/parsers/excelParser');

// Construye un workbook de prueba en memoria que imita la estructura real
// del archivo institucional: filas de metadatos, una fila senuelo con
// PLACA suelto, la fila de headers real, y filas de datos.
async function buildTestWorkbook({ includeDecoyRow = true } = {}) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Toma Fisica');

  // filas de metadatos institucionales (1-14), irrelevantes para el parser
  for (let i = 1; i <= 14; i++) sheet.addRow([`metadato fila ${i}`]);

  if (includeDecoyRow) {
    // fila senuelo: contiene PLACA en columna B pero NO responsable en D,
    // el parser debe ignorarla (esto reproduce el bug real de la fila 15)
    sheet.addRow(['UBICADO', 'PLACA', 'DESCRIPCION']);
  }

  // fila real de headers (debe tener PLACA en B y RESPONSABLE en D)
  sheet.addRow([
    'UBICADO', 'PLACA', 'DESCRIPCION', 'RESPONSABLE',
    'CENTRO FUNCIONAL SISTEMA', 'CENTRO FUNCIONAL LECTURA',
    'UBICACION FISICA', 'RESPONSABLE LECTURA',
  ]);

  // filas de datos reales
  sheet.addRow(['SI', "'12345", 'SILLA DE OFICINA', 'JUAN PEREZ',
    'CENTRO ACADEMICO DE ALAJUELA', 'CENTRO ACADEMICO DE ALAJUELA',
    'AULA 1', 'JUAN PEREZ']);
  sheet.addRow(['', '67890', 'MESA', 'MARIA LOPEZ',
    'ESCUELA DE FISICA', '', '', '']);

  // fila de subencabezado repetida (separador de seccion), debe descartarse
  sheet.addRow(['UBICADO', 'PLACA', 'DESCRIPCION', 'RESPONSABLE']);

  // fila completamente vacia, debe descartarse
  sheet.addRow([]);

  return workbook.xlsx.writeBuffer();
}

describe('parseExcel', () => {
  test('detecta la fila de headers correcta ignorando filas senuelo', async () => {
    const buffer = await buildTestWorkbook({ includeDecoyRow: true });
    const assets = await parseExcel(buffer);
    expect(assets.length).toBe(2);
  });

  test('lee correctamente las columnas D a H', async () => {
    const buffer = await buildTestWorkbook();
    const assets = await parseExcel(buffer);
    const silla = assets.find(a => a.asset_number === '12345');

    expect(silla.description).toBe('SILLA DE OFICINA');
    expect(silla.responsible).toBe('JUAN PEREZ');
    expect(silla.functional_center).toBe('CENTRO ACADEMICO DE ALAJUELA');
  });

  test('limpia apostrofes iniciales de formato Excel en asset_number', async () => {
    const buffer = await buildTestWorkbook();
    const assets = await parseExcel(buffer);
    const silla = assets.find(a => a.description === 'SILLA DE OFICINA');
    expect(silla.asset_number).toBe('12345');
  });

  test('descarta filas de subencabezado repetidas', async () => {
    const buffer = await buildTestWorkbook();
    const assets = await parseExcel(buffer);
    // si la fila de subencabezado se hubiera procesado, "PLACA" aparecer
    // como un asset_number, lo cual nunca debe pasar
    expect(assets.some(a => a.asset_number === 'PLACA')).toBe(false);
  });

  test('descarta filas completamente vacias', async () => {
    const buffer = await buildTestWorkbook();
    const assets = await parseExcel(buffer);
    expect(assets.every(a => a.asset_number)).toBe(true);
  });

  test('campos vacios del Excel van a metadata, no a columnas directas', async () => {
    const buffer = await buildTestWorkbook();
    const assets = await parseExcel(buffer);
    const mesa = assets.find(a => a.asset_number === '67890');
    expect(mesa.metadata.ubicacion_fisica).toBeNull();
  });

  test('lanza error claro si no encuentra la fila de headers', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Vacio');
    sheet.addRow(['esto no tiene ninguna columna PLACA']);
    const buffer = await workbook.xlsx.writeBuffer();

    await expect(parseExcel(buffer)).rejects.toThrow(/PLACA/);
  });
});