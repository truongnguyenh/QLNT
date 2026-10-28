import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countActiveOccupants,
  canAddResidentToRoom,
  validateResidentCapacity,
  processResidentMoveOut,
  getAuthorizedRooms,
  getAuthorizedResidents,
  authenticateAccount,
  canUserAccessBoardingHouse,
  validatePasswordStrength,
  sortRoomsNaturally,
  getNextRoomSuggestion,
  deriveRoomCodeSuffix,
  normalizeRoomName,
  DEFAULT_ROOMS,
  DEFAULT_RESIDENTS,
  DEFAULT_ACCOUNTS,
} from './rentalRules.ts';
import { NhanKhau, Phong, TaiKhoan } from '../types/rental.ts';

test('countActiveOccupants only counts "Đang ở" status for specific room', () => {
  // Phòng 101 has 4 active occupants in default data
  const countP101 = countActiveOccupants(DEFAULT_RESIDENTS, 'NT01', 'Phòng 101');
  assert.equal(countP101, 4);

  // Phòng 201 has 1 active occupant and 1 'Đã chuyển đi'
  const countP201 = countActiveOccupants(DEFAULT_RESIDENTS, 'NT01', 'Phòng 201');
  assert.equal(countP201, 1);
});

test('canAddResidentToRoom enforces max 4 occupants limit', () => {
  // Phòng 101 is already at 4/4
  const canAddP101 = canAddResidentToRoom(DEFAULT_RESIDENTS, 'NT01', 'Phòng 101');
  assert.equal(canAddP101, false);

  // Phòng 102 has 2 occupants, so can add
  const canAddP102 = canAddResidentToRoom(DEFAULT_RESIDENTS, 'NT01', 'Phòng 102');
  assert.equal(canAddP102, true);
});

test('validateResidentCapacity blocks adding resident when room is full', () => {
  const resultFull = validateResidentCapacity(DEFAULT_RESIDENTS, 'NT01', 'Phòng 101');
  assert.equal(resultFull.valid, false);
  assert.match(resultFull.error || '', /đã đủ tối đa 4 người/);

  const resultAvailable = validateResidentCapacity(DEFAULT_RESIDENTS, 'NT01', 'Phòng 102');
  assert.equal(resultAvailable.valid, true);
  assert.equal(resultAvailable.currentCount, 2);
});

test('processResidentMoveOut changes status to "Đã chuyển đi" and sets NgayChuyenDi', () => {
  const resident = DEFAULT_RESIDENTS.find((r) => r.ID === 'NK001')!;
  assert.equal(resident.TrangThai, 'Đang ở');

  const updated = processResidentMoveOut(resident, '2026-10-27');
  assert.equal(updated.TrangThai, 'Đã chuyển đi');
  assert.equal(updated.NgayChuyenDi, '2026-10-27');

  // Verify that after move out, room capacity frees up
  const modifiedResidents = DEFAULT_RESIDENTS.map((r) =>
    r.ID === 'NK001' ? updated : r
  );
  const newCount = countActiveOccupants(modifiedResidents, 'NT01', 'Phòng 101');
  assert.equal(newCount, 3);
  assert.equal(canAddResidentToRoom(modifiedResidents, 'NT01', 'Phòng 101'), true);
});

test('Authorization filtering works for ADMIN and USER', () => {
  const adminUser = DEFAULT_ACCOUNTS.find((a) => a.Role === 'ADMIN')!;
  const regularUser = DEFAULT_ACCOUNTS.find((a) => a.Username === 'chutro1')!;

  // Admin can see all rooms if filter is ALL
  const adminRoomsAll = getAuthorizedRooms(DEFAULT_ROOMS, adminUser, 'ALL');
  assert.equal(adminRoomsAll.length, DEFAULT_ROOMS.length);

  // Admin can filter by NT02
  const adminRoomsNT02 = getAuthorizedRooms(DEFAULT_ROOMS, adminUser, 'NT02');
  assert.equal(adminRoomsNT02.length, 2);

  // USER (chutro1) can only see NT01 rooms
  const userRooms = getAuthorizedRooms(DEFAULT_ROOMS, regularUser);
  assert.equal(userRooms.length, 4);
  assert.ok(userRooms.every((r) => r.MaNhaTro === 'NT01'));

  // USER (chutro1) can only see NT01 residents
  const userResidents = getAuthorizedResidents(DEFAULT_RESIDENTS, regularUser);
  assert.ok(userResidents.every((r) => r.MaNhaTro === 'NT01'));
});

test('Security hardening: strict password check, password sanitization, and scope isolation', () => {
  const accountsWithBlank: TaiKhoan[] = [
    ...DEFAULT_ACCOUNTS,
    { Username: 'nopass', Password: '', Role: 'USER', MaNhaTro: 'NT03', TenNhaTro: 'Test' },
  ];

  // Reject wrong password or empty password account
  assert.equal(authenticateAccount(accountsWithBlank, 'admin', 'wrong'), null);
  assert.equal(authenticateAccount(accountsWithBlank, 'nopass', ''), null);

  // Accept valid password and strip plaintext password from session object
  const sessionUser = authenticateAccount(accountsWithBlank, 'admin', 'admin123');
  assert.ok(sessionUser);
  assert.equal(sessionUser.Username, 'admin');
  assert.equal(sessionUser.Password, '');

  // Tenant scope isolation
  const chutro1 = DEFAULT_ACCOUNTS.find((a) => a.Username === 'chutro1')!;
  assert.equal(canUserAccessBoardingHouse(chutro1, 'NT01'), true);
  assert.equal(canUserAccessBoardingHouse(chutro1, 'NT02'), false);
  assert.equal(canUserAccessBoardingHouse(sessionUser, 'NT02'), true);

  // Password strength validation
  assert.equal(validatePasswordStrength('123').valid, false);
  assert.equal(validatePasswordStrength('MatKhauAnToan123').valid, true);
});

test('Natural room sorting and sequential room numbering prevent out-of-order rooms', () => {
  const unsortedRooms: Phong[] = [
    { MaPhong: 'NT01-P201', MaNhaTro: 'NT01', TenNhaTro: 'A', TenPhong: 'Phòng 201', GhiChu: '' },
    { MaPhong: 'NT01-P10', MaNhaTro: 'NT01', TenNhaTro: 'A', TenPhong: 'Phòng 10', GhiChu: '' },
    { MaPhong: 'NT01-P2', MaNhaTro: 'NT01', TenNhaTro: 'A', TenPhong: 'Phòng 2', GhiChu: '' },
    { MaPhong: 'NT01-P207', MaNhaTro: 'NT01', TenNhaTro: 'A', TenPhong: '104', GhiChu: '' },
    { MaPhong: 'NT01-P1', MaNhaTro: 'NT01', TenNhaTro: 'A', TenPhong: 'Phòng 01', GhiChu: '' },
  ];

  const sorted = sortRoomsNaturally(unsortedRooms);
  assert.deepEqual(
    sorted.map((r) => r.TenPhong),
    ['Phòng 01', 'Phòng 2', 'Phòng 10', '104', 'Phòng 201']
  );

  // Bare number normalization and room code derivation
  assert.equal(normalizeRoomName('104'), 'Phòng 104');
  assert.equal(normalizeRoomName('Phòng 105'), 'Phòng 105');
  assert.equal(deriveRoomCodeSuffix('Phòng 104'), 'P104');
  assert.equal(deriveRoomCodeSuffix('03'), 'P03');

  // Next room suggestion for NT02 (which has Phòng 01, Phòng 02)
  const nextNT02 = getNextRoomSuggestion(DEFAULT_ROOMS, 'NT02');
  assert.equal(nextNT02.nextTenPhong, 'Phòng 03');
  assert.equal(nextNT02.nextMaPhongSuffix, 'P03');
});
