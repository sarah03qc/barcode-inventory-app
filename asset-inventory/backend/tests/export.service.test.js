jest.mock('../src/modules/export/export.repository');
jest.mock('../src/modules/inventory/inventory.repository');

const exportRepo = require('../src/modules/export/export.repository');
const inventoryRepo = require('../src/modules/inventory/inventory.repository');
const service = require('../src/modules/export/export.service');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('buildSessionWorkbook', () => {
  const baseSession = {
    id: 's1', location: 'Edificio X', custodian: 'Ana',
    status: 'closed', upload_batch_id: 'b1',
    started_at: new Date(), closed_at: new Date(),
  };

  test('lanza 404 si la sesion no existe', async () => {
    inventoryRepo.findSessionById.mockResolvedValue(null);
    await expect(service.buildSessionWorkbook('no-existe'))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('genera exactamente 4 hojas con los nombres correctos', async () => {
    inventoryRepo.findSessionById.mockResolvedValue(baseSession);
    exportRepo.findSessionScansForExport.mockResolvedValue([]);
    exportRepo.findMissingForExport.mockResolvedValue([]);

    const { workbook } = await service.buildSessionWorkbook('s1');
    expect(workbook.worksheets.map(s => s.name)).toEqual([
      'Resumen', 'Ubicados', 'Externos', 'No Ubicados',
    ]);
  });

  test('hoja Ubicados muestra "Sin escaneo anterior" cuando no hay escaneo previo', async () => {
    inventoryRepo.findSessionById.mockResolvedValue(baseSession);
    exportRepo.findSessionScansForExport.mockResolvedValue([{
      scan_type: 'located',
      asset_number: '1',
      previous_custodian: null,
      previous_location: null,
      previous_scanned_at: null,
    }]);
    exportRepo.findMissingForExport.mockResolvedValue([]);

    const { workbook } = await service.buildSessionWorkbook('s1');
    const sheet = workbook.getWorksheet('Ubicados');
    const dataRow = sheet.getRow(2);

    const previousCustodianCol = sheet.columns.findIndex(c => c.key === 'previous_custodian') + 1;
    expect(dataRow.getCell(previousCustodianCol).value).toBe('Sin escaneo anterior');
  });
});