jest.mock('../src/modules/reports/reports.repository');
jest.mock('../src/modules/inventory/inventory.repository');

const reportsRepo = require('../src/modules/reports/reports.repository');
const inventoryRepo = require('../src/modules/inventory/inventory.repository');
const service = require('../src/modules/reports/reports.service');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getStats', () => {
  test('calcula missing = total - located', async () => {
    inventoryRepo.findSessionById.mockResolvedValue({ status: 'active', upload_batch_id: 'b1' });
    reportsRepo.countTotalInBatch.mockResolvedValue(100);
    reportsRepo.countLocated.mockResolvedValue(30);
    reportsRepo.countByType.mockResolvedValue(5);

    const stats = await service.getStats('s1');
    expect(stats.missing).toBe(70);
  });

  test('calcula progress_percent redondeado a 2 decimales', async () => {
    inventoryRepo.findSessionById.mockResolvedValue({ status: 'active', upload_batch_id: 'b1' });
    reportsRepo.countTotalInBatch.mockResolvedValue(3);
    reportsRepo.countLocated.mockResolvedValue(1);
    reportsRepo.countByType.mockResolvedValue(0);

    const stats = await service.getStats('s1');
    expect(stats.progress_percent).toBe(33.33);
  });

  test('no divide por cero si el batch esta vacio', async () => {
    inventoryRepo.findSessionById.mockResolvedValue({ status: 'active', upload_batch_id: 'b1' });
    reportsRepo.countTotalInBatch.mockResolvedValue(0);
    reportsRepo.countLocated.mockResolvedValue(0);
    reportsRepo.countByType.mockResolvedValue(0);

    const stats = await service.getStats('s1');
    expect(stats.progress_percent).toBe(0);
  });

  test('lanza 404 si la sesion no existe', async () => {
    inventoryRepo.findSessionById.mockResolvedValue(null);
    await expect(service.getStats('no-existe')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('getLocatedReport / getMissingReport / getExternalReport', () => {
  test('los tres lanzan 404 si la sesion no existe', async () => {
    inventoryRepo.findSessionById.mockResolvedValue(null);

    await expect(service.getLocatedReport('x')).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.getMissingReport('x')).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.getExternalReport('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});