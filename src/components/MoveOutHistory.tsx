import React, { useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { NhanKhau, Phong } from '../types/rental.ts';

interface MoveOutHistoryProps {
  residents: NhanKhau[];
  rooms: Phong[];
  onDeleteResident: (id: string) => void;
}

export const MoveOutHistory: React.FC<MoveOutHistoryProps> = ({
  residents,
  onDeleteResident,
}) => {
  const movedOutList = residents.filter((r) => r.TrangThai === 'Đã chuyển đi');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = movedOutList.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.HoTen.toLowerCase().includes(q) ||
      r.QueQuan.toLowerCase().includes(q) ||
      r.TenPhong.toLowerCase().includes(q) ||
      r.TenNhaTro.toLowerCase().includes(q) ||
      r.ID.toLowerCase().includes(q)
    );
  });

  const calculateStayDuration = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return '—';
    try {
      const start = new Date(startStr);
      const end = new Date(endStr);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const months = Math.floor(diffDays / 30);
      const days = diffDays % 30;
      if (months > 0) {
        return `${months} tháng ${days > 0 ? days + ' ngày' : ''}`;
      }
      return `${diffDays} ngày`;
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Lịch sử nhân khẩu chuyển đi ({movedOutList.length})
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Danh sách các nhân khẩu đã trả phòng và giải phóng chỗ trống.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm trong lịch sử..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <h4 className="text-sm font-semibold text-slate-800">
              Chưa có lịch sử chuyển đi
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Khi bấm nút "Chuyển đi" ở danh sách nhân khẩu, hồ sơ sẽ lưu tại đây.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Mã ID</th>
                  <th className="py-3 px-4">Họ và tên</th>
                  <th className="py-3 px-4">Giới tính · Quê quán</th>
                  <th className="py-3 px-4">Phòng cũ · Nhà trọ</th>
                  <th className="py-3 px-4">Ngày vào ở</th>
                  <th className="py-3 px-4">Ngày chuyển đi</th>
                  <th className="py-3 px-4">Thời gian lưu trú</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((resident) => (
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
                      <span className="text-slate-600">{resident.QueQuan}</span>
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

                    <td className="py-3 px-4 font-mono tabular-nums text-slate-500">
                      {resident.NgayVaoO}
                    </td>

                    <td className="py-3 px-4 font-mono tabular-nums font-semibold text-red-600">
                      {resident.NgayChuyenDi || '—'}
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {calculateStayDuration(resident.NgayVaoO, resident.NgayChuyenDi)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteResident(resident.ID)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition cursor-pointer"
                        title="Xóa bản ghi lịch sử"
                        aria-label={`Xóa bản ghi lịch sử của ${resident.HoTen}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
