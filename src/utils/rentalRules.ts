import {
  TaiKhoan,
  Phong,
  NhanKhau,
  MAX_RESIDENTS_PER_ROOM,
} from '../types/rental.ts';

export { MAX_RESIDENTS_PER_ROOM };

/**
 * Counts active residents ('Đang ở') in a specific room of a boarding house
 */
export function countActiveOccupants(
  residents: NhanKhau[],
  maNhaTro: string,
  tenPhong: string
): number {
  return residents.filter(
    (r) =>
      r.MaNhaTro === maNhaTro &&
      r.TenPhong.trim().toLowerCase() === tenPhong.trim().toLowerCase() &&
      r.TrangThai === 'Đang ở'
  ).length;
}

/**
 * Checks whether another resident can be added to the room (Limit: 4 people)
 */
export function canAddResidentToRoom(
  residents: NhanKhau[],
  maNhaTro: string,
  tenPhong: string
): boolean {
  const currentCount = countActiveOccupants(residents, maNhaTro, tenPhong);
  return currentCount < MAX_RESIDENTS_PER_ROOM;
}

/**
 * Validates adding a new resident or moving into a room.
 * Throws or returns an error message if room is already at capacity (4/4).
 */
export function validateResidentCapacity(
  residents: NhanKhau[],
  maNhaTro: string,
  tenPhong: string,
  currentResidentId?: string
): { valid: boolean; error?: string; currentCount: number } {
  // If editing an existing resident who is already 'Đang ở' in this room, they shouldn't count against themselves
  const otherOccupants = residents.filter(
    (r) =>
      r.ID !== currentResidentId &&
      r.MaNhaTro === maNhaTro &&
      r.TenPhong.trim().toLowerCase() === tenPhong.trim().toLowerCase() &&
      r.TrangThai === 'Đang ở'
  );

  const currentCount = otherOccupants.length;
  if (currentCount >= MAX_RESIDENTS_PER_ROOM) {
    return {
      valid: false,
      error: `Phòng "${tenPhong}" đã đủ tối đa ${MAX_RESIDENTS_PER_ROOM} người đang ở! Không thể thêm hoặc chuyển người vào phòng này.`,
      currentCount,
    };
  }

  return { valid: true, currentCount };
}

/**
 * Transitions a resident to 'Đã chuyển đi' and sets the move-out date
 */
export function processResidentMoveOut(
  resident: NhanKhau,
  ngayChuyenDi?: string
): NhanKhau {
  const dateStr = ngayChuyenDi || new Date().toISOString().split('T')[0];
  return {
    ...resident,
    TrangThai: 'Đã chuyển đi',
    NgayChuyenDi: dateStr,
  };
}

/**
 * Filters rooms accessible to the current user
 */
export function getAuthorizedRooms(
  rooms: Phong[],
  user: TaiKhoan | null,
  adminFilterMaNhaTro: string = 'ALL'
): Phong[] {
  if (!user) return [];
  if (user.Role === 'ADMIN') {
    if (!adminFilterMaNhaTro || adminFilterMaNhaTro === 'ALL') {
      return rooms;
    }
    return rooms.filter((p) => p.MaNhaTro === adminFilterMaNhaTro);
  }
  // User can only see rooms belonging to their MaNhaTro
  return rooms.filter((p) => p.MaNhaTro === user.MaNhaTro);
}

/**
 * Filters residents accessible to the current user
 */
export function getAuthorizedResidents(
  residents: NhanKhau[],
  user: TaiKhoan | null,
  adminFilterMaNhaTro: string = 'ALL'
): NhanKhau[] {
  if (!user) return [];
  if (user.Role === 'ADMIN') {
    if (!adminFilterMaNhaTro || adminFilterMaNhaTro === 'ALL') {
      return residents;
    }
    return residents.filter((r) => r.MaNhaTro === adminFilterMaNhaTro);
  }
  // User can only see residents belonging to their MaNhaTro
  return residents.filter((r) => r.MaNhaTro === user.MaNhaTro);
}

/**
 * Get distinct list of boarding houses from accounts/rooms
 */
export function getDistinctBoardingHouses(
  rooms: Phong[],
  accounts: TaiKhoan[]
): { maNhaTro: string; tenNhaTro: string }[] {
  const map = new Map<string, string>();

  // Add from accounts
  accounts.forEach((acc) => {
    if (acc.MaNhaTro && acc.MaNhaTro !== 'ALL') {
      map.set(acc.MaNhaTro, acc.TenNhaTro || acc.MaNhaTro);
    }
  });

  // Add from rooms
  rooms.forEach((r) => {
    if (r.MaNhaTro && !map.has(r.MaNhaTro)) {
      map.set(r.MaNhaTro, r.TenNhaTro || r.MaNhaTro);
    }
  });

  return Array.from(map.entries()).map(([maNhaTro, tenNhaTro]) => ({
    maNhaTro,
    tenNhaTro,
  }));
}

/**
 * Strictly authenticates a username and password against the accounts list.
 * Never allows empty passwords and strips Password from the returned session object.
 */
export function authenticateAccount(
  accounts: TaiKhoan[],
  username: string,
  password: string
): TaiKhoan | null {
  const cleanUser = username.trim().toLowerCase();
  if (!cleanUser || !password) return null;

  const matched = accounts.find(
    (acc) =>
      acc.Username.trim().toLowerCase() === cleanUser &&
      Boolean(acc.Password) &&
      String(acc.Password) === password
  );

  if (!matched) return null;

  return {
    ...matched,
    Password: '',
  };
}

/**
 * Checks if a user has permission to mutate data belonging to a given MaNhaTro
 */
export function canUserAccessBoardingHouse(
  user: TaiKhoan | null,
  maNhaTro: string
): boolean {
  if (!user) return false;
  if (user.Role === 'ADMIN') return true;
  return Boolean(maNhaTro) && user.MaNhaTro === maNhaTro;
}

/**
 * Validates password strength when creating or changing passwords
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = password.trim();
  if (trimmed.length < 6) {
    return {
      valid: false,
      error: 'Mật khẩu mới phải có ít nhất 6 ký tự để đảm bảo an toàn.',
    };
  }
  return { valid: true };
}

/**
 * Default Initial Seed Data matching Google Sheets schema
 */
export const DEFAULT_ACCOUNTS: TaiKhoan[] = [
  {
    Username: 'admin',
    Password: 'admin123',
    Role: 'ADMIN',
    MaNhaTro: 'ALL',
    TenNhaTro: 'Tất cả nhà trọ',
  },
  {
    Username: 'chutro1',
    Password: '123456',
    Role: 'USER',
    MaNhaTro: 'NT01',
    TenNhaTro: 'Nhà trọ Bình An',
  },
  {
    Username: 'chutro2',
    Password: '123456',
    Role: 'USER',
    MaNhaTro: 'NT02',
    TenNhaTro: 'Nhà trọ Hưng Thịnh',
  },
];

export const DEFAULT_ROOMS: Phong[] = [
  // Nhà trọ Bình An (NT01)
  {
    MaPhong: 'NT01-P101',
    MaNhaTro: 'NT01',
    TenNhaTro: 'Nhà trọ Bình An',
    TenPhong: 'Phòng 101',
    GhiChu: 'Tầng 1 - Mặt tiền, có máy lạnh',
  },
  {
    MaPhong: 'NT01-P102',
    MaNhaTro: 'NT01',
    TenNhaTro: 'Nhà trọ Bình An',
    TenPhong: 'Phòng 102',
    GhiChu: 'Tầng 1 - Gác lửng, quạt trần',
  },
  {
    MaPhong: 'NT01-P201',
    MaNhaTro: 'NT01',
    TenNhaTro: 'Nhà trọ Bình An',
    TenPhong: 'Phòng 201',
    GhiChu: 'Tầng 2 - Có ban công thoáng mát',
  },
  {
    MaPhong: 'NT01-P202',
    MaNhaTro: 'NT01',
    TenNhaTro: 'Nhà trọ Bình An',
    TenPhong: 'Phòng 202',
    GhiChu: 'Tầng 2 - Phòng góc, vệ sinh khép kín',
  },
  // Nhà trọ Hưng Thịnh (NT02)
  {
    MaPhong: 'NT02-P1',
    MaNhaTro: 'NT02',
    TenNhaTro: 'Nhà trọ Hưng Thịnh',
    TenPhong: 'Phòng 01',
    GhiChu: 'Dãy A, diện tích 22m2',
  },
  {
    MaPhong: 'NT02-P2',
    MaNhaTro: 'NT02',
    TenNhaTro: 'Nhà trọ Hưng Thịnh',
    TenPhong: 'Phòng 02',
    GhiChu: 'Dãy A, gần cổng ra vào',
  },
];

export const DEFAULT_RESIDENTS: NhanKhau[] = [
  // Phòng 101 - Đang ở 4 người (FULL để test khóa nút "Thêm người")
  {
    ID: 'NK001',
    MaNhaTro: 'NT01',
    TenNhaTro: 'Nhà trọ Bình An',
    TenPhong: 'Phòng 101',
    HoTen: 'Nguyễn Văn An',
    NgaySinh: '1998-05-12',
    GioiTinh: 'Nam',
    QueQuan: 'Hà Nam',
    NgayVaoO: '2023-08-01',
    TamTru: 'Đã khai báo',
    TrangThai: 'Đang ở',
    NgayChuyenDi: '',
  },
  {
    ID: 'NK002',
    MaNhaTro: 'NT01',
    TenNhaTro: 'Nhà trọ Bình An',
    TenPhong: 'Phòng 101',
    HoTen: 'Trần Văn Bình',
    NgaySinh: '1999-11-20',
    GioiTinh: 'Nam',
    QueQuan: 'Thái Bình',
    NgayVaoO: '2023-08-01',
    TamTru: 'Đã khai báo',
    TrangThai: 'Đang ở',
    NgayChuyenDi: '',
  },
  {
    ID: 'NK003',
    MaNhaTro: 'NT01',
    TenNhaTro: 'Nhà trọ Bình An',
    TenPhong: 'Phòng 101',
    HoTen: 'Lê Minh Cường',
    NgaySinh: '2000-02-14',
    GioiTinh: 'Nam',
    QueQuan: 'Nam Định',
    NgayVaoO: '2023-09-15',
    TamTru: 'Chưa khai báo',
    TrangThai: 'Đang ở',
    NgayChuyenDi: '',
  },
  {
    ID: 'NK004',
    MaNhaTro: 'NT01',
    TenNhaTro: 'Nhà trọ Bình An',
    TenPhong: 'Phòng 101',
    HoTen: 'Phạm Hoàng Dũng',
    NgaySinh: '2001-07-08',
    GioiTinh: 'Nam',
    QueQuan: 'Thanh Hóa',
    NgayVaoO: '2023-10-01',
    TamTru: 'Đã khai báo',
    TrangThai: 'Đang ở',
    NgayChuyenDi: '',
  },

  // Phòng 102 - Đang ở 2 người
  {
    ID: 'NK005',
    MaNhaTro: 'NT01',
    TenNhaTro: 'Nhà trọ Bình An',
    TenPhong: 'Phòng 102',
    HoTen: 'Đỗ Thị Hạnh',
    NgaySinh: '1997-04-22',
    GioiTinh: 'Nữ',
    QueQuan: 'Nghệ An',
    NgayVaoO: '2024-01-10',
    TamTru: 'Đã khai báo',
    TrangThai: 'Đang ở',
    NgayChuyenDi: '',
  },
  {
    ID: 'NK006',
    MaNhaTro: 'NT01',
    TenNhaTro: 'Nhà trọ Bình An',
    TenPhong: 'Phòng 102',
    HoTen: 'Vũ Thị Mai',
    NgaySinh: '1998-09-18',
    GioiTinh: 'Nữ',
    QueQuan: 'Hải Dương',
    NgayVaoO: '2024-01-10',
    TamTru: 'Chưa khai báo',
    TrangThai: 'Đang ở',
    NgayChuyenDi: '',
  },

  // Phòng 201 - Đang ở 1 người, 1 người đã chuyển đi
  {
    ID: 'NK007',
    MaNhaTro: 'NT01',
    TenNhaTro: 'Nhà trọ Bình An',
    TenPhong: 'Phòng 201',
    HoTen: 'Hoàng Quốc Việt',
    NgaySinh: '1995-12-03',
    GioiTinh: 'Nam',
    QueQuan: 'Bắc Giang',
    NgayVaoO: '2023-11-01',
    TamTru: 'Đã khai báo',
    TrangThai: 'Đang ở',
    NgayChuyenDi: '',
  },
  {
    ID: 'NK008',
    MaNhaTro: 'NT01',
    TenNhaTro: 'Nhà trọ Bình An',
    TenPhong: 'Phòng 201',
    HoTen: 'Bùi Đức Thắng',
    NgaySinh: '1996-03-30',
    GioiTinh: 'Nam',
    QueQuan: 'Phú Thọ',
    NgayVaoO: '2023-05-10',
    TamTru: 'Đã khai báo',
    TrangThai: 'Đã chuyển đi',
    NgayChuyenDi: '2024-02-28',
  },

  // Nhà trọ Hưng Thịnh (NT02)
  {
    ID: 'NK009',
    MaNhaTro: 'NT02',
    TenNhaTro: 'Nhà trọ Hưng Thịnh',
    TenPhong: 'Phòng 01',
    HoTen: 'Lê Thu Hương',
    NgaySinh: '2002-06-15',
    GioiTinh: 'Nữ',
    QueQuan: 'Quảng Ninh',
    NgayVaoO: '2024-03-01',
    TamTru: 'Đã khai báo',
    TrangThai: 'Đang ở',
    NgayChuyenDi: '',
  },
  {
    ID: 'NK010',
    MaNhaTro: 'NT02',
    TenNhaTro: 'Nhà trọ Hưng Thịnh',
    TenPhong: 'Phòng 02',
    HoTen: 'Nguyễn Văn Nam',
    NgaySinh: '1994-08-25',
    GioiTinh: 'Nam',
    QueQuan: 'Vĩnh Phúc',
    NgayVaoO: '2022-09-01',
    TamTru: 'Đã khai báo',
    TrangThai: 'Đã chuyển đi',
    NgayChuyenDi: '2023-12-31',
  },
];
