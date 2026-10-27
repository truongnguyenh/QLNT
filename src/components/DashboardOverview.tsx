import React from 'react';
import {
  ArrowRight,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { Phong, NhanKhau, TaiKhoan } from '../types/rental.ts';
import { countActiveOccupants, MAX_RESIDENTS_PER_ROOM } from '../utils/rentalRules.ts';

interface DashboardOverviewProps {
  rooms: Phong[];
  residents: NhanKhau[];
  currentUser: TaiKhoan;
  selectedFilterNhaTro: string;
  onSelectFilterNhaTro: (maNT: string) => void;
  boardingHouses: { maNhaTro: string; tenNhaTro: string }[];
  onNavigateToTab: (tab: string) => void;
  onOpenAddResident?: (room?: Phong) => void;
  onToggleTamTru?: (resident: NhanKhau) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  rooms,
  residents,
  currentUser,
  selectedFilterNhaTro,
  onSelectFilterNhaTro,
  boardingHouses,
  onNavigateToTab,
  onOpenAddResident,
  onToggleTamTru,
}) => {
  const activeResidents = residents.filter((r) => r.TrangThai === 'Đang ở');
  const declaredTamTru = activeResidents.filter((r) => r.TamTru === 'Đã khai báo').length;
  const unDeclaredList = activeResidents.filter((r) => r.TamTru === 'Chưa khai báo');
  const unDeclaredTamTru = unDeclaredList.length;

  const roomOccupancyMap = rooms.map((room) => {
    const count = countActiveOccupants(residents, room.MaNhaTro, room.TenPhong);
    return {
      room,
      count,
      isFull: count >= MAX_RESIDENTS_PER_ROOM,
    };
  });

  const fullRooms = roomOccupancyMap.filter((r) => r.isFull);
  const totalCapacity = rooms.length * MAX_RESIDENTS_PER_ROOM;
  const availableSlots = Math.max(0, totalCapacity - activeResidents.length);
  const occupancyRate =
    totalCapacity > 0 ? Math.round((activeResidents.length / totalCapacity) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Workspace Header & Filter Control */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Bảng điều khiển</span>
            <span aria-hidden="true">·</span>
            <span>
              {currentUser.Role === 'ADMIN'
                ? 'Quyền Quản trị viên (Toàn hệ thống)'
                : `Đơn vị: ${currentUser.TenNhaTro}`}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Tổng quan vận hành nhà trọ
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {currentUser.Role === 'ADMIN' && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="filterNhaTroSelect"
                className="text-xs font-semibold text-slate-600 whitespace-nowrap"
              >
                Nhà trọ:
              </label>
              <select
                id="filterNhaTroSelect"
                value={selectedFilterNhaTro}
                onChange={(e) => onSelectFilterNhaTro(e.target.value)}
                className="bg-white border border-slate-300 text-slate-900 text-xs font-semibold rounded-lg px-3 py-2 outline-hidden focus:ring-2 focus:ring-slate-900 cursor-pointer"
              >
                <option value="ALL">
                  Tất cả nhà trọ ({boardingHouses.length})
                </option>
                {boardingHouses.map((h) => (
                  <option key={h.maNhaTro} value={h.maNhaTro}>
                    {h.tenNhaTro} ({h.maNhaTro})
                  </option>
                ))}
              </select>
            </div>
          )}

          {onOpenAddResident && (
            <button
              type="button"
              onClick={() => onOpenAddResident()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Thêm nhân khẩu</span>
            </button>
          )}
        </div>
      </div>

      {/* 4-Column Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs font-medium text-slate-500">Tổng số phòng</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
              {rooms.length}
            </span>
            <span className="text-xs text-slate-500">phòng</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Sức chứa tối đa <span className="font-mono tabular-nums font-semibold text-slate-700">{totalCapacity}</span> người (4 người/phòng)
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs font-medium text-slate-500">Nhân khẩu đang ở</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
              {activeResidents.length}
            </span>
            <span className="text-xs font-semibold text-emerald-700 font-mono tabular-nums">
              {occupancyRate}% lấp đầy
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Còn trống <span className="font-mono tabular-nums font-semibold text-slate-700">{availableSlots}</span> chỗ có thể nhận thêm
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs font-medium text-slate-500">Hồ sơ tạm trú</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
              {declaredTamTru}
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              / {activeResidents.length} đã khai báo
            </span>
          </div>
          <div className="mt-2 text-xs">
            {unDeclaredTamTru > 0 ? (
              <span className="text-amber-700 font-medium">
                Cần hoàn tất {unDeclaredTamTru} hồ sơ chưa khai báo
              </span>
            ) : (
              <span className="text-emerald-700 font-medium">
                100% nhân khẩu đã khai báo tạm trú
              </span>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs font-medium text-slate-500">Phòng chạm trần (4/4)</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-red-600 font-mono tabular-nums">
              {fullRooms.length}
            </span>
            <span className="text-xs text-slate-500">phòng đã đầy</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {fullRooms.length > 0
              ? 'Tự động khóa thêm người vào phòng đầy'
              : 'Tất cả các phòng đều còn chỗ trống'}
          </div>
        </div>
      </div>

      {/* Two-Column Operational Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Panel 1: Room Capacity Quick Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Trạng thái công suất các phòng
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Phòng đủ 4 người sẽ tự động khóa chức năng thêm nhân khẩu
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('rooms')}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <span>Quản lý phòng</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {roomOccupancyMap.map(({ room, count, isFull }) => (
              <div
                key={room.MaPhong}
                className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">
                    {room.TenPhong}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <span>{room.TenNhaTro}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{room.MaPhong}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div
                      className={`text-xs font-bold font-mono tabular-nums ${
                        isFull
                          ? 'text-red-600'
                          : count > 0
                          ? 'text-emerald-700'
                          : 'text-slate-500'
                      }`}
                    >
                      {count}/{MAX_RESIDENTS_PER_ROOM} người
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {isFull ? 'Đã đầy' : `Còn ${MAX_RESIDENTS_PER_ROOM - count} chỗ`}
                    </div>
                  </div>

                  {isFull ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-400 cursor-not-allowed whitespace-nowrap">
                      <Lock className="w-3 h-3 text-red-500" />
                      <span>Khóa</span>
                    </span>
                  ) : (
                    onOpenAddResident && (
                      <button
                        type="button"
                        onClick={() => onOpenAddResident(room)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer whitespace-nowrap"
                      >
                        + Thêm người
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 2: Pending Temporary Residence Declarations */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Nhân khẩu cần khai báo tạm trú ({unDeclaredTamTru})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Danh sách người đang ở chưa hoàn tất thủ tục đăng ký tạm trú
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('residents')}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <span>Tất cả nhân khẩu</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {unDeclaredTamTru === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-900">
                100% nhân khẩu đã khai báo tạm trú
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Không có hồ sơ tạm trú nào còn tồn đọng cần xử lý.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {unDeclaredList.map((r) => (
                <div
                  key={r.ID}
                  className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {r.HoTen}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span>{r.TenPhong}</span>
                      <span aria-hidden="true">·</span>
                      <span>{r.TenNhaTro}</span>
                      <span aria-hidden="true">·</span>
                      <span>Vào ở: <span className="font-mono tabular-nums">{r.NgayVaoO}</span></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onToggleTamTru ? (
                      <button
                        type="button"
                        onClick={() => onToggleTamTru(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-emerald-50 hover:text-emerald-800 border border-amber-200 hover:border-emerald-200 transition cursor-pointer whitespace-nowrap"
                        title="Bấm để xác nhận đã khai báo tạm trú"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Xác nhận khai báo</span>
                      </button>
                    ) : (
                      <span className="text-xs font-medium text-amber-700">
                        Chưa khai báo
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
