const mockDb = {
  execAsync: jest.fn().mockResolvedValue(undefined),
  runAsync: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowId: 1 }),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  getAllAsync: jest.fn().mockResolvedValue([]),
};

export const openDatabaseAsync = jest.fn().mockResolvedValue(mockDb);
export const SQLiteDatabase = jest.fn();
