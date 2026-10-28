import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Edit2,
  AlertCircle,
  Building,
  DoorClosed,
  Calendar,
  MapPin,
  CheckCircle,
} from 'lucide-react';
import {
  NhanKhau,
  Phong,
  TaiKhoan,
  TamTruStatus,
  GioiTinh,
  MAX_RESIDENTS_PER_ROOM,
} from '../types/rental.ts';
import {
  countActiveOccupants,
  validateResidentCapacity,
  sortRoomsNaturally,
  normalizeRoomName,
} from '../utils/rentalRules.ts';

interface ResidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (resident: NhanKhau) => { success: boolean; message?: string };
  residentToEdit: NhanKhau | null;
  defaultRoom: Phong | null;
  rooms: Phong[];
  residents: NhanKhau[];
  currentUser: TaiKhoan;
  boardingHouses: { maNhaTro: string; tenNhaTro: string }[];
}

export const ResidentModal: React.FC<ResidentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  residentToEdit,
  defaultRoom,
  rooms,
  residents,
  currentUser,
  boardingHouses,
}) => {
  const isEditing = Boolean(residentToEdit);

  // Initial values
  const [maNhaTro, setMaNhaTro] = useState(
    residentToEdit?.MaNhaTro ||
    defaultRoom?.MaNhaTro ||
    (currentUser.Role === 'ADMIN' ? (boardingHouses[0]?.maNhaTro || 'NT01') : currentUser.MaNhaTro)
  );

  const [tenPhong, setTenPhong] = useState(
    residentToEdit?.TenPhong || defaultRoom?.TenPhong || ''
  );

  const [hoTen, setHoTen] = useState(residentToEdit?.HoTen || '');
  const [ngaySinh, setNgaySinh] = useState(residentToEdit?.NgaySinh || '2000-01-01');
  const [gioiTinh, setGioiTinh] = useState<GioiTinh>(residentToEdit?.GioiTinh || 'Nam');
  const [queQuan, setQueQuan] = useState(residentToEdit?.QueQuan || '');
  const [ngayVaoO, setNgayVaoO] = useState(
    residentToEdit?.NgayVaoO || new Date().toISOString().split('T')[0]
  );
  const [tamTru, setTamTru] = useState<TamTruStatus>(
    residentToEdit?.TamTru || 'Đã khai báo'
  );
  const [error, setError] = useState<string | null>(null);

  // Sync state when props change
  useEffect(() => {
    if (residentToEdit) {
      setMaNhaTro(residentToEdit.MaNhaTro);
      setTenPhong(residentToEdit.TenPhong);
      setHoTen(residentToEdit.HoTen);
      setNgaySinh(residentToEdit.NgaySinh);
      setGioiTinh(residentToEdit.GioiTinh);
      setQueQuan(residentToEdit.QueQuan);
      setNgayVaoO(residentToEdit.NgayVaoO);
      setTamTru(residentToEdit.TamTru);
    } else {
      const targetHouse = defaultRoom?.MaNhaTro || (currentUser.Role === 'ADMIN' ? (boardingHouses[0]?.maNhaTro || 'NT01') : currentUser.MaNhaTro);
      setMaNhaTro(targetHouse);
      const availableRoomsForHouse = sortRoomsNaturally(
        rooms.filter((r) => r.MaNhaTro === targetHouse)
      );
      setTenPhong(defaultRoom?.TenPhong || (availableRoomsForHouse[0]?.TenPhong || ''));
      setHoTen('');
      setNgaySinh('2000-01-01');
      setGioiTinh('Nam');
      setQueQuan('');
      setNgayVaoO(new Date().toISOString().split('T')[0]);
      setTamTru('Đã khai báo');
    }
    setError(null);
  }, [residentToEdit, defaultRoom, isOpen]);

  if (!isOpen) return null;

  // Filter and sort available rooms in the selected house
  const roomsInHouse = sortRoomsNaturally(
    rooms.filter((r) => r.MaNhaTro === maNhaTro)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hoTen.trim()) {
      setError('Vui lòng nhập họ và tên nhân khẩu');
      return;
    }
    if (!tenPhong.trim()) {
      setError('Vui lòng chọn phòng trọ');
      return;
    }

    // Check capacity rule: Max 4 active occupants
    const capacityCheck = validateResidentCapacity(
      residents,
      maNhaTro,
      tenPhong,
      residentToEdit?.ID
    );

    if (!capacityCheck.valid) {
      setError(capacityCheck.error || 'Phòng đã đủ 4 người đang ở!');
      return;
    }

    const houseObj = boardingHouses.find((h) => h.maNhaTro === maNhaTro);
    const tenNhaTro = houseObj ? houseObj.tenNhaTro : currentUser.TenNhaTro;

    const payload: NhanKhau = {
      ID: residentToEdit?.ID || ('NK' + String(Date.now()).slice(-6)),
      MaNhaTro: maNhaTro,
      TenNhaTro: tenNhaTro,
      TenPhong: tenPhong,
      HoTen: hoTen.trim(),
      NgaySinh: ngaySinh,
      GioiTinh: gioiTinh,
      QueQuan: queQuan.trim() || 'Chưa cập nhật',
      NgayVaoO: ngayVaoO,
      TamTru: tamTru,
      TrangThai: 'Đang ở',
      NgayChuyenDi: '',
    };

    const res = onSave(payload);
    if (!res.success) {
      setError(res.message || 'Lỗi khi lưu thông tin');
      return;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            {isEditing ? (
              <Edit2 className="w-5 h-5 text-blue-600" />
            ) : (
              <UserPlus className="w-5 h-5 text-emerald-600" />
            )}
            <span>{isEditing ? 'Sửa thông tin nhân khẩu' : 'Thêm nhân khẩu vào phòng'}</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* House and Room selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nhà trọ
              </label>
              {currentUser.Role === 'ADMIN' ? (
                <select
                  value={maNhaTro}
                  onChange={(e) => {
                    const newHouse = e.target.value;
                    setMaNhaTro(newHouse);
                    const roomsForHouse = rooms.filter((r) => r.MaNhaTro === newHouse);
                    setTenPhong(roomsForHouse[0]?.TenPhong || '');
                  }}
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-hidden focus:ring-2 focus:ring-blue-500"
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
                  value={currentUser.TenNhaTro}
                  className="w-full text-xs border border-slate-200 bg-slate-100 rounded-xl p-2.5 text-slate-500"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phòng trọ <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={tenPhong}
                onChange={(e) => setTenPhong(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {roomsInHouse.length === 0 ? (
                  <option value="">Chưa có phòng nào</option>
                ) : (
                  roomsInHouse.map((r) => {
                    const count = countActiveOccupants(residents, r.MaNhaTro, r.TenPhong);
                    const isRoomFull = count >= MAX_RESIDENTS_PER_ROOM;
                    const isSelfRoom = residentToEdit && residentToEdit.TenPhong === r.TenPhong;
                    const disabled = isRoomFull && !isSelfRoom;

                    return (
                      <option key={r.MaPhong} value={r.TenPhong} disabled={disabled}>
                        {r.TenPhong} — ({count}/{MAX_RESIDENTS_PER_ROOM} người {isRoomFull ? '• ĐÃ ĐẦY' : '• Còn chỗ'})
                      </option>
                    );
                  })
                )}
              </select>
            </div>
          </div>

          {/* Full Name & Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={hoTen}
                onChange={(e) => setHoTen(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn An"
                className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Giới tính
              </label>
              <select
                value={gioiTinh}
                onChange={(e) => setGioiTinh(e.target.value as GioiTinh)}
                className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
          </div>

          {/* Birth date & Hometown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngày sinh
              </label>
              <input
                type="date"
                value={ngaySinh}
                onChange={(e) => setNgaySinh(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quê quán / Thường trú
              </label>
              <input
                type="text"
                value={queQuan}
                onChange={(e) => setQueQuan(e.target.value)}
                placeholder="Ví dụ: Hà Nam, Thái Bình..."
                className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Move-in date & Temporary Residence status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngày vào ở
              </label>
              <input
                type="date"
                value={ngayVaoO}
                onChange={(e) => setNgayVaoO(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Khai báo tạm trú (Công an)
              </label>
              <select
                value={tamTru}
                onChange={(e) => setTamTru(e.target.value as TamTruStatus)}
                className={`w-full text-xs font-semibold border rounded-xl p-2.5 outline-hidden ${
                  tamTru === 'Đã khai báo'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-amber-300 bg-amber-50 text-amber-800'
                }`}
              >
                <option value="Đã khai báo">✓ Đã khai báo</option>
                <option value="Chưa khai báo">⚠ Chưa khai báo</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
            >
              {isEditing ? 'Cập nhật nhân khẩu' : 'Thêm vào phòng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
