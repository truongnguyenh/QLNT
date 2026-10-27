export type UserRole = 'ADMIN' | 'USER';

export interface TaiKhoan {
  Username: string;
  Password?: string;
  Role: UserRole;
  MaNhaTro: string; // 'ALL' for admin, or 'NT01', etc.
  TenNhaTro: string;
}

export interface Phong {
  MaPhong: string;
  MaNhaTro: string;
  TenNhaTro: string;
  TenPhong: string;
  GhiChu: string;
}

export type TamTruStatus = 'Đã khai báo' | 'Chưa khai báo';
export type TrangThaiCuTru = 'Đang ở' | 'Đã chuyển đi';
export type GioiTinh = 'Nam' | 'Nữ' | 'Khác';

export interface NhanKhau {
  ID: string;
  MaNhaTro: string;
  TenNhaTro: string;
  TenPhong: string;
  HoTen: string;
  NgaySinh: string;
  GioiTinh: GioiTinh;
  QueQuan: string;
  NgayVaoO: string;
  TamTru: TamTruStatus;
  TrangThai: TrangThaiCuTru;
  NgayChuyenDi: string;
}

export const MAX_RESIDENTS_PER_ROOM = 4;
