import React, { useState } from 'react';
import {
  DoorClosed,
  Plus,
  Lock,
  Edit2,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { Phong, NhanKhau, TaiKhoan, MAX_RESIDENTS_PER_ROOM } from '../types/rental.ts';
import {
  countActiveOccupants,
  getNextRoomSuggestion,
  deriveRoomCodeSuffix,
  normalizeRoomName,
  sortRoomsNaturally,
} from '../utils/rentalRules.ts';

interface RoomListProps {
  rooms: Phong[];
  residents: NhanKhau[];
  currentUser: TaiKhoan;
  boardingHouses: { maNhaTro: string; tenNhaTro: string }[];
  onAddResidentToRoom: (room: Phong) => void;
  onSaveRoom: (room: Phong) => void;
  onDeleteRoom: (maPhong: string) => void;
  onMoveOutResident: (residentId: string) => void;
  selectedFilterNhaTro?: string;
  onSelectFilterNhaTro?: (maNT: string) => void;
}

export const RoomList: React.FC<RoomListProps> = ({
  rooms,
  residents,
  currentUser,
  boardingHouses,
  onAddResidentToRoom,
  onSaveRoom,
  onDeleteRoom,
  onMoveOutResident,
  selectedFilterNhaTro = 'ALL',
  onSelectFilterNhaTro,
}) => {
  const sortedRooms = sortRoomsNaturally(rooms);

  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Phong | null>(null);
  const [selectedRoomDetail, setSelectedRoomDetail] = useState<Phong | null>(null);

  const [formMaPhong, setFormMaPhong] = useState('');
  const [formTenPhong, setFormTenPhong] = useState('');
  const [formMaNhaTro, setFormMaNhaTro] = useState(
    currentUser.Role === 'ADMIN' ? (boardingHouses[0]?.maNhaTro || 'NT01') : currentUser.MaNhaTro
  );
  const [formGhiChu, setFormGhiChu] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const openAddModal = () => {
    const targetHouse =
      currentUser.Role === 'ADMIN'
        ? selectedFilterNhaTro !== 'ALL'
          ? selectedFilterNhaTro
          : boardingHouses[0]?.maNhaTro || 'NT01'
        : currentUser.MaNhaTro;

    const suggestion = getNextRoomSuggestion(sortedRooms, targetHouse);

    setEditingRoom(null);
    setFormMaNhaTro(targetHouse);
    setFormTenPhong(suggestion.nextTenPhong);
    setFormMaPhong(suggestion.nextMaPhongSuffix);
    setFormGhiChu('');
    setFormError(null);
    setIsAddRoomModalOpen(true);
  };

  const openEditModal = (room: Phong) => {
    setEditingRoom(room);
    setFormMaPhong(room.MaPhong);
    setFormTenPhong(normalizeRoomName(room.TenPhong));
    setFormMaNhaTro(room.MaNhaTro);
    setFormGhiChu(room.GhiChu);
    setFormError(null);
    setIsAddRoomModalOpen(true);
  };

  const handleTenPhongChange = (val: string) => {
    setFormTenPhong(val);
    if (!editingRoom) {
      setFormMaPhong(deriveRoomCodeSuffix(val));
    }
  };

  const handleHouseChangeInModal = (newMaNhaTro: string) => {
    setFormMaNhaTro(newMaNhaTro);
    if (!editingRoom) {
      const suggestion = getNextRoomSuggestion(sortedRooms, newMaNhaTro);
      setFormTenPhong(suggestion.nextTenPhong);
      setFormMaPhong(suggestion.nextMaPhongSuffix);
    }
  };

  const handleSaveRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTenPhong.trim()) {
      setFormError('Vui lòng nhập tên hoặc số phòng (ví dụ: Phòng 101)');
      return;
    }

    const normalizedName = normalizeRoomName(formTenPhong);

    const isDuplicate = sortedRooms.some(
      (r) =>
        r.MaNhaTro === formMaNhaTro &&
        r.MaPhong !== editingRoom?.MaPhong &&
        normalizeRoomName(r.TenPhong).toLowerCase() === normalizedName.toLowerCase()
    );

    if (isDuplicate) {
      setFormError(`"${normalizedName}" đã tồn tại trong nhà trọ này.`);
      return;
    }

    const houseObj = boardingHouses.find((h) => h.maNhaTro === formMaNhaTro);
    const tenNhaTro = houseObj ? houseObj.tenNhaTro : currentUser.TenNhaTro;
    const suffix = formMaPhong.trim() || deriveRoomCodeSuffix(normalizedName);
    const finalMaPhong = editingRoom
      ? editingRoom.MaPhong
      : suffix.startsWith(formMaNhaTro + '-')
      ? suffix
      : `${formMaNhaTro}-${suffix}`;

    const newRoom: Phong = {
      MaPhong: finalMaPhong,
      MaNhaTro: formMaNhaTro,
      TenNhaTro: tenNhaTro,
      TenPhong: normalizedName,
      GhiChu: formGhiChu.trim(),
    };

    onSaveRoom(newRoom);
    setIsAddRoomModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Danh sách phòng trọ ({sortedRooms.length})
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Sắp xếp tự động theo đúng số thứ tự phòng tăng dần · Tối đa 4 người đang ở mỗi phòng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {currentUser.Role === 'ADMIN' && onSelectFilterNhaTro && (
            <select
              aria-label="Lọc theo nhà trọ"
              value={selectedFilterNhaTro}
              onChange={(e) => onSelectFilterNhaTro(e.target.value)}
              className="bg-white border border-slate-300 text-slate-900 text-xs font-semibold rounded-lg px-3 py-2 outline-hidden focus:ring-2 focus:ring-slate-900 cursor-pointer"
            >
              <option value="ALL">Tất cả nhà trọ ({boardingHouses.length})</option>
              {boardingHouses.map((h) => (
                <option key={h.maNhaTro} value={h.maNhaTro}>
                  {h.tenNhaTro} ({h.maNhaTro})
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm phòng mới</span>
          </button>
        </div>
      </div>

      {/* Room Grid */}
      {sortedRooms.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-xl border border-slate-200">
          <DoorClosed className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">Chưa có phòng nào</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Bấm vào nút "Thêm phòng mới" phía trên để khởi tạo danh sách phòng trọ.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedRooms.map((room, idx) => {
            const activeOccupants = residents.filter(
              (r) =>
                r.MaNhaTro === room.MaNhaTro &&
                r.TenPhong.trim().toLowerCase() === room.TenPhong.trim().toLowerCase() &&
                r.TrangThai === 'Đang ở'
            );
            const count = activeOccupants.length;
            const isFull = count >= MAX_RESIDENTS_PER_ROOM;

            return (
              <div
                key={room.MaPhong}
                className="bg-white rounded-xl p-5 border border-slate-200 flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div>
                  {/* Card Top Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-slate-400 tabular-nums">
                          #{idx + 1}
                        </span>
                        <h3 className="text-base font-bold text-slate-900">
                          {normalizeRoomName(room.TenPhong)}
                        </h3>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span>{room.TenNhaTro}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{room.MaPhong}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-xs font-bold font-mono tabular-nums ${
                          isFull
                            ? 'text-red-600'
                            : count > 0
                            ? 'text-emerald-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {count}/{MAX_RESIDENTS_PER_ROOM} {isFull ? 'ĐÃ ĐẦY' : 'Người'}
                      </div>
                    </div>
                  </div>

                  {room.GhiChu && (
                    <p className="mt-2.5 text-xs text-slate-500">
                      {room.GhiChu}
                    </p>
                  )}

                  {/* 4 Occupancy Slots */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                    {[0, 1, 2, 3].map((slotIdx) => {
                      const occupant = activeOccupants[slotIdx];
                      if (occupant) {
                        return (
                          <div
                            key={occupant.ID}
                            className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-50 text-xs"
                          >
                            <div className="truncate pr-2">
                              <span className="font-semibold text-slate-900">
                                {occupant.HoTen}
                              </span>
                              <span className="text-slate-400 mx-1.5" aria-hidden="true">
                                ·
                              </span>
                              <span className="text-slate-500">{occupant.QueQuan}</span>
                            </div>
                            <span
                              className={`text-[11px] font-medium shrink-0 ${
                                occupant.TamTru === 'Đã khai báo'
                                  ? 'text-emerald-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {occupant.TamTru}
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={slotIdx}
                          className="flex items-center justify-between py-1.5 px-2.5 rounded-lg border border-dashed border-slate-200 text-xs text-slate-400"
                        >
                          <span>Vị trí {slotIdx + 1}</span>
                          <span>Còn trống</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Card Bottom Actions */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedRoomDetail(room)}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer whitespace-nowrap"
                    >
                      Chi tiết ({count})
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(room)}
                      className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                      title="Sửa phòng"
                      aria-label={`Sửa phòng ${room.TenPhong}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteRoom(room.MaPhong)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                      title="Xóa phòng"
                      aria-label={`Xóa phòng ${room.TenPhong}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {isFull ? (
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      title="Phòng đã đủ 4 người đang ở! Nút bị khóa."
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed whitespace-nowrap"
                    >
                      <Lock className="w-3 h-3 text-red-500" />
                      <span>Đã đủ 4 người</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAddResidentToRoom(room)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer whitespace-nowrap"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Thêm người</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add / Edit Room */}
      {isAddRoomModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              {editingRoom ? 'Chỉnh sửa thông tin phòng' : 'Thêm phòng trọ mới'}
            </h3>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveRoomSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nhà trọ
                </label>
                {currentUser.Role === 'ADMIN' ? (
                  <select
                    value={formMaNhaTro}
                    onChange={(e) => handleHouseChangeInModal(e.target.value)}
                    disabled={Boolean(editingRoom)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-hidden focus:ring-2 focus:ring-slate-900"
                  >
                    {boardingHouses.map((h) => (
                      <option key={h.maNhaTro} value={h.maNhaTro}>
                        {h.tenNhaTro} ({h.maNhaTro})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled
                    value={`${currentUser.TenNhaTro} (${currentUser.MaNhaTro})`}
                    className="w-full text-xs border border-slate-200 bg-slate-100 rounded-lg p-2.5 text-slate-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên / Số phòng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTenPhong}
                  onChange={(e) => handleTenPhongChange(e.target.value)}
                  placeholder="Ví dụ: Phòng 103 (hoặc nhập 103)"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã phòng (Tự động khớp theo số phòng)
                </label>
                <input
                  type="text"
                  value={formMaPhong}
                  onChange={(e) => setFormMaPhong(e.target.value)}
                  disabled={Boolean(editingRoom)}
                  placeholder="Ví dụ: P103"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-hidden focus:ring-2 focus:ring-slate-900 font-mono disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú (Tầng, tiện nghi, diện tích...)
                </label>
                <textarea
                  rows={2}
                  value={formGhiChu}
                  onChange={(e) => setFormGhiChu(e.target.value)}
                  placeholder="Ví dụ: Tầng 1, có máy lạnh..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddRoomModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  {editingRoom ? 'Lưu thay đổi' : 'Tạo phòng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Room Occupants Detail */}
      {selectedRoomDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedRoomDetail.TenPhong}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedRoomDetail.TenNhaTro} · Mã: <span className="font-mono">{selectedRoomDetail.MaPhong}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRoomDetail(null)}
                className="text-slate-400 hover:text-slate-700 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              <div className="text-xs font-semibold text-slate-600">
                Nhân khẩu đang cư trú ({countActiveOccupants(residents, selectedRoomDetail.MaNhaTro, selectedRoomDetail.TenPhong)}/4 người)
              </div>

              {residents
                .filter(
                  (r) =>
                    r.MaNhaTro === selectedRoomDetail.MaNhaTro &&
                    r.TenPhong.trim().toLowerCase() === selectedRoomDetail.TenPhong.trim().toLowerCase() &&
                    r.TrangThai === 'Đang ở'
                )
                .map((occupant) => (
                  <div
                    key={occupant.ID}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900">
                        {occupant.HoTen} ({occupant.GioiTinh})
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Sinh: <span className="font-mono">{occupant.NgaySinh}</span> · Quê: {occupant.QueQuan} · Vào: <span className="font-mono">{occupant.NgayVaoO}</span>
                      </div>
                      <div className="text-[11px] font-medium text-slate-600 mt-0.5">
                        Tạm trú: {occupant.TamTru}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRoomDetail(null);
                        onMoveOutResident(occupant.ID);
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition cursor-pointer whitespace-nowrap"
                    >
                      Chuyển đi
                    </button>
                  </div>
                ))}

              {countActiveOccupants(residents, selectedRoomDetail.MaNhaTro, selectedRoomDetail.TenPhong) === 0 && (
                <p className="text-xs text-slate-400 py-6 text-center">
                  Phòng này hiện chưa có người ở.
                </p>
              )}
            </div>

            <div className="mt-6 pt-3 border-t border-slate-200 flex justify-between items-center">
              <span className="text-xs text-slate-500">
                Định mức tối đa: 4 người/phòng
              </span>
              <button
                type="button"
                onClick={() => setSelectedRoomDetail(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
