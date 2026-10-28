import React, { useState } from 'react';
import {
  Search,
  UserPlus,
  Edit2,
  Trash2,
  LogOut,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { NhanKhau, Phong, TaiKhoan } from '../types/rental.ts';
import { compareRoomNameStrings, normalizeRoomName } from '../utils/rentalRules.ts';

interface ResidentListProps {
  residents: NhanKhau[];
  rooms: Phong[];
  currentUser: TaiKhoan;
  boardingHouses: { maNhaTro: string; tenNhaTro: string }[];
  onOpenAddModal: () => void;
  onEditResident: (resident: NhanKhau) => void;
  onDeleteResident: (id: string) => void;
  onMoveOutResident: (residentId: string, ngayChuyenDi?: string) => void;
  onToggleTamTru: (resident: NhanKhau) => void;
  selectedFilterNhaTro?: string;
  onSelectFilterNhaTro?: (maNT: string) => void;
}

export const ResidentList: React.FC<ResidentListProps> = ({
  residents,
  rooms,
  currentUser,
  boardingHouses,
  onOpenAddModal,
  onEditResident,
  onDeleteResident,
  onMoveOutResident,
  onToggleTamTru,
  selectedFilterNhaTro = 'ALL',
  onSelectFilterNhaTro,
}) => {
  const activeResidents = residents.filter((r) => r.TrangThai === 'Đang ở');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterPhong, setFilterPhong] = useState('ALL');
  const [filterTamTru, setFilterTamTru] = useState('ALL');

  const [moveOutTarget, setMoveOutTarget] = useState<NhanKhau | null>(null);
  const [moveOutDate, setMoveOutDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const filteredList = activeResidents.filter((r) => {
    if (filterPhong !== 'ALL' && r.TenPhong !== filterPhong) return false;
    if (filterTamTru !== 'ALL' && r.TamTru !== filterTamTru) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.HoTen.toLowerCase().includes(q);
      const matchOrigin = r.QueQuan.toLowerCase().includes(q);
      const matchId = r.ID.toLowerCase().includes(q);
      const matchRoom = r.TenPhong.toLowerCase().includes(q);
      if (!matchName && !matchOrigin && !matchId && !matchRoom) return false;
    }
    return true;
  });

  const distinctRooms = Array.from(
    new Set(rooms.map((r) => r.TenPhong))
  ).sort(compareRoomNameStrings);

  const handleConfirmMoveOut = () => {
    if (!moveOutTarget) return;
    onMoveOutResident(moveOutTarget.ID, moveOutDate);
    setMoveOutTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Nhân khẩu đang cư trú ({activeResidents.length})
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý hồ sơ nhân khẩu, trạng thái khai báo tạm trú và thủ tục trả phòng.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" />
          <span>Thêm nhân khẩu mới</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo họ tên, quê quán, mã ID, phòng..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-slate-900"
          />
        </div>

        {currentUser.Role === 'ADMIN' && onSelectFilterNhaTro && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="residentHouseFilter"
              className="text-xs font-semibold text-slate-600 shrink-0"
            >
              Nhà trọ:
            </label>
            <select
              id="residentHouseFilter"
              value={selectedFilterNhaTro}
              onChange={(e) => {
                onSelectFilterNhaTro(e.target.value);
                setFilterPhong('ALL');
              }}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 outline-hidden focus:ring-2 focus:ring-slate-900 bg-white cursor-pointer"
            >
              <option value="ALL">Tất cả ({boardingHouses.length})</option>
              {boardingHouses.map((h) => (
                <option key={h.maNhaTro} value={h.maNhaTro}>
                  {h.tenNhaTro}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <label
            htmlFor="filterRoomSelect"
            className="text-xs font-semibold text-slate-600 shrink-0"
          >
            Phòng:
          </label>
          <select
            id="filterRoomSelect"
            value={filterPhong}
            onChange={(e) => setFilterPhong(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 outline-hidden focus:ring-2 focus:ring-slate-900 bg-white cursor-pointer"
          >
            <option value="ALL">Tất cả phòng ({distinctRooms.length})</option>
            {distinctRooms.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="filterTamTruSelect"
            className="text-xs font-semibold text-slate-600 shrink-0"
          >
            Tạm trú:
          </label>
          <select
            id="filterTamTruSelect"
            value={filterTamTru}
            onChange={(e) => setFilterTamTru(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 outline-hidden focus:ring-2 focus:ring-slate-900 bg-white cursor-pointer"
          >
            <option value="ALL">Tất cả</option>
            <option value="Đã khai báo">Đã khai báo</option>
            <option value="Chưa khai báo">Chưa khai báo</option>
          </select>
        </div>
      </div>

      {/* High-Density Data Grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="text-center py-12">
            <h4 className="text-sm font-semibold text-slate-800">
              Không tìm thấy nhân khẩu nào
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Thử thay đổi từ khóa tìm kiếm hoặc thêm nhân khẩu mới vào phòng.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Mã ID</th>
                  <th className="py-3 px-4">Họ và tên</th>
                  <th className="py-3 px-4">Giới tính · Ngày sinh</th>
                  <th className="py-3 px-4">Quê quán</th>
                  <th className="py-3 px-4">Phòng · Nhà trọ</th>
                  <th className="py-3 px-4">Ngày vào ở</th>
                  <th className="py-3 px-4">Tạm trú</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredList.map((resident) => (
                  <tr
                    key={resident.ID}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-500">
                      {resident.ID}
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-900">
                      {resident.HoTen}
                    </td>

                    <td className="py-3 px-4">
                      <span>{resident.GioiTinh}</span>
                      <span className="mx-1.5 text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-mono tabular-nums text-slate-500">
                        {resident.NgaySinh}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      {resident.QueQuan}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900">
                        {resident.TenPhong}
                      </span>
                      <span className="mx-1.5 text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-slate-500">{resident.TenNhaTro}</span>
                    </td>

                    <td className="py-3 px-4 font-mono tabular-nums text-slate-600">
                      {resident.NgayVaoO}
                    </td>

                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => onToggleTamTru(resident)}
                        title="Bấm để đổi trạng thái tạm trú"
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition cursor-pointer whitespace-nowrap ${
                          resident.TamTru === 'Đã khai báo'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        {resident.TamTru === 'Đã khai báo' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        )}
                        <span>{resident.TamTru}</span>
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setMoveOutTarget(resident)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          title="Chuyển đi và nhường chỗ trống cho phòng"
                        >
                          <LogOut className="w-3 h-3" />
                          <span>Chuyển đi</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onEditResident(resident)}
                          className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition cursor-pointer"
                          title="Sửa thông tin"
                          aria-label={`Sửa thông tin ${resident.HoTen}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteResident(resident.ID)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition cursor-pointer"
                          title="Xóa vĩnh viễn"
                          aria-label={`Xóa nhân khẩu ${resident.HoTen}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal for "Chuyển đi" */}
      {moveOutTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              Xác nhận nhân khẩu chuyển đi
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Nhân khẩu <strong className="text-slate-900">{moveOutTarget.HoTen}</strong> tại{' '}
              <strong className="text-slate-900">{moveOutTarget.TenPhong}</strong> ({moveOutTarget.TenNhaTro}) sẽ chuyển sang trạng thái{' '}
              <strong>"Đã chuyển đi"</strong>, lưu vào tab Lịch sử và giải phóng 1 chỗ trống cho phòng.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngày chuyển đi
              </label>
              <input
                type="date"
                required
                value={moveOutDate}
                onChange={(e) => setMoveOutDate(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-hidden focus:ring-2 focus:ring-slate-900 font-mono"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMoveOutTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmMoveOut}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition cursor-pointer"
              >
                Xác nhận chuyển đi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
