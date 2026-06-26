jest.mock('../src/modules/assets/assets.repository');
jest.mock('../src/shared/parsers/excelParser');
jest.mock('../src/shared/parsers/csvParser');

const repository = require('../src/modules/assets/assets.repository');
const parseExcel = require('../src/shared/parsers/excelParser');
const parseCsv = require('../src/shared/parsers/csvParser');
const service = require('../src/modules/assets/assets.service');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('uploadAssets', () => {
  test('detecta formato Excel por extension .xlsx', async () => {
    parseExcel.mockResolvedValue([{ asset_number: '1' }]);
    repository.createBatch.mockResolvedValue({ id: 'b1' });
    repository.insertAssets.mockResolvedValue([]);
    repository.updateBatchStatus.mockResolvedValue({ id: 'b1', status: 'done' });

    await service.uploadAssets({ originalname: 'archivo.xlsx', buffer: Buffer.from(''), mimetype: '' });
    expect(parseExcel).toHaveBeenCalled();
  });

  test('detecta formato CSV por extension .csv', async () => {
    parseCsv.mockResolvedValue([{ asset_number: '1' }]);
    repository.createBatch.mockResolvedValue({ id: 'b1' });
    repository.insertAssets.mockResolvedValue([]);
    repository.updateBatchStatus.mockResolvedValue({ id: 'b1', status: 'done' });

    await service.uploadAssets({ originalname: 'archivo.csv', buffer: Buffer.from(''), mimetype: '' });
    expect(parseCsv).toHaveBeenCalled();
  });

  test('lanza 422 si ningun registro tiene asset_number', async () => {
    parseExcel.mockResolvedValue([{ description: 'sin placa' }]);

    await expect(service.uploadAssets({
      originalname: 'archivo.xlsx', buffer: Buffer.from(''), mimetype: '',
    })).rejects.toMatchObject({ statusCode: 422 });
  });

  test('marca el batch como error si insertAssets falla', async () => {
    parseExcel.mockResolvedValue([{ asset_number: '1' }]);
    repository.createBatch.mockResolvedValue({ id: 'b1' });
    repository.insertAssets.mockRejectedValue(new Error('fallo de BD'));

    await expect(service.uploadAssets({
      originalname: 'archivo.xlsx', buffer: Buffer.from(''), mimetype: '',
    })).rejects.toThrow('fallo de BD');

    expect(repository.updateBatchStatus).toHaveBeenCalledWith('b1', 'error');
  });
});

describe('getActiveBatch', () => {
  test('lanza 404 si no hay batch activo', async () => {
    repository.findActiveBatch.mockResolvedValue(null);
    await expect(service.getActiveBatch()).rejects.toMatchObject({ statusCode: 404 });
  });

  test('retorna el batch si existe', async () => {
    repository.findActiveBatch.mockResolvedValue({ id: 'b1' });
    const result = await service.getActiveBatch();
    expect(result.id).toBe('b1');
  });
});

describe('findAsset', () => {
  test('lanza 404 si el activo no existe en el batch', async () => {
    repository.findByAssetNumber.mockResolvedValue(null);
    await expect(service.findAsset('999', 'b1')).rejects.toMatchObject({ statusCode: 404 });
  });
});