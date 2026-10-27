import React, { useState } from 'react';
import {
  UserPlus,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  Trash2,
} from 'lucide-react';
import { TaiKhoan, UserRole } from '../types/rental.ts';
import { validatePasswordStrength } from '../utils/rentalRules.ts';

interface AccountManagementProps {
  accounts: TaiKhoan[];
  currentUser: TaiKhoan;
  onSaveAccount: (account: TaiKhoan) => void;
  onDeleteAccount: (username: string) => void;
}

export const AccountManagement: React.FC<AccountManagementProps> = ({
  accounts,
  currentUser,
  onSaveAccount,
  onDeleteAccount,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<TaiKhoan | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);

  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('USER');
  const [formMaNhaTro, setFormMaNhaTro] = useState('NT03');
  const [formTenNhaTro, setFormTenNhaTro] = useState('Nhà trọ Hướng Dương');
  const [formError, setFormError] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingAccount(null);
    setFormUsername('');
    setFormPassword('');
    setFormRole('USER');
    setFormMaNhaTro('NT03');
    setFormTenNhaTro('');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (acc: TaiKhoan) => {
    setEditingAccount(acc);
    setFormUsername(acc.Username);
    setFormPassword('');
    setFormRole(acc.Role);
    setFormMaNhaTro(acc.MaNhaTro === 'ALL' ? 'NT01' : acc.MaNhaTro);
    setFormTenNhaTro(acc.Role === 'ADMIN' ? 'Tất cả nhà trọ' : acc.TenNhaTro);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formUsername.trim()) {
      setFormError('Vui lòng nhập Tên đăng nhập (Username).');
      return;
    }

    if (!editingAccount) {
      const usernameExists = accounts.some(
        (a) => a.Username.toLowerCase() === formUsername.trim().toLowerCase()
      );
      if (usernameExists) {
        setFormError(
          `Username "${formUsername.trim()}" đã tồn tại. Vui lòng chọn tên khác.`
        );
        return;
      }
    }

    const passwordToSave =
      editingAccount && !formPassword.trim()
        ? editingAccount.Password
        : formPassword.trim();

    if (!editingAccount || formPassword.trim()) {
      const passCheck = validatePasswordStrength(passwordToSave);
      if (!passCheck.valid) {
        setFormError(passCheck.error || 'Mật khẩu phải từ 6 ký tự trở lên.');
        return;
      }
    }

    if (formRole === 'USER' && (!formMaNhaTro.trim() || !formTenNhaTro.trim())) {
      setFormError('Vui lòng nhập đầy đủ Mã nhà trọ và Tên nhà trọ.');
      return;
    }

    const newAccount: TaiKhoan = {
      Username: editingAccount ? editingAccount.Username : formUsername.trim(),
      Password: passwordToSave,
      Role: formRole,
      MaNhaTro: formRole === 'ADMIN' ? 'ALL' : formMaNhaTro.trim().toUpperCase(),
      TenNhaTro: formRole === 'ADMIN' ? 'Tất cả nhà trọ' : formTenNhaTro.trim(),
    };

    onSaveAccount(newAccount);
    setIsAddModalOpen(false);
    setEditingAccount(null);
    setFormUsername('');
    setFormPassword('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Quản lý tài khoản & Phân quyền ({accounts.length})
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Dữ liệu lưu tại Sheet 'TaiKhoan'. ADMIN quản lý toàn bộ, USER chỉ truy cập trong phạm vi mã nhà trọ được cấp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPasswords(!showPasswords)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition cursor-pointer whitespace-nowrap"
          >
            {showPasswords ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
            <span>{showPasswords ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tạo tài khoản mới</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Tên đăng nhập</th>
                <th className="py-3 px-4">Mật khẩu</th>
                <th className="py-3 px-4">Vai trò</th>
                <th className="py-3 px-4">Mã nhà trọ</th>
                <th className="py-3 px-4">Tên nhà trọ phụ trách</th>
                <th className="py-3 px-4">Phạm vi quyền hạn</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {accounts.map((acc) => {
                const isSelf =
                  acc.Username.toLowerCase() ===
                  currentUser.Username.toLowerCase();
                return (
                  <tr
                    key={acc.Username}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                      {acc.Username}
                      {isSelf && (
                        <span className="ml-2 text-[11px] font-sans font-normal text-emerald-700">
                          (Bạn)
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-500">
                      {showPasswords ? acc.Password || '••••••' : '••••••••'}
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {acc.Role}
                    </td>

                    <td className="py-3 px-4 font-mono tabular-nums font-semibold text-slate-800">
                      {acc.MaNhaTro}
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-900">
                      {acc.TenNhaTro}
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {acc.Role === 'ADMIN'
                        ? 'Toàn quyền hệ thống (ALL)'
                        : `Giới hạn trong ${acc.MaNhaTro}`}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(acc)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          title="Cập nhật mật khẩu hoặc phân quyền"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>Đặt lại MK / Sửa</span>
                        </button>

                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => onDeleteAccount(acc.Username)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition cursor-pointer"
                            title="Xóa tài khoản"
                            aria-label={`Xóa tài khoản ${acc.Username}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              {editingAccount
                ? `Cập nhật tài khoản "${editingAccount.Username}"`
                : 'Tạo tài khoản nhà trọ mới'}
            </h3>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên đăng nhập (Username) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingAccount)}
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="Ví dụ: chutro3"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-hidden focus:ring-2 focus:ring-slate-900 font-mono disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {editingAccount
                    ? 'Mật khẩu mới (Để trống nếu giữ nguyên)'
                    : 'Mật khẩu (Tối thiểu 6 ký tự) *'}
                </label>
                <input
                  type="password"
                  required={!editingAccount}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Nhập mật khẩu an toàn (>= 6 ký tự)"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-hidden focus:ring-2 focus:ring-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vai trò (Role)
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                >
                  <option value="USER">USER - Quản lý 1 nhà trọ riêng</option>
                  <option value="ADMIN">ADMIN - Quản trị viên (Mã ALL)</option>
                </select>
              </div>

              {formRole === 'USER' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mã nhà trọ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formMaNhaTro}
                      onChange={(e) => setFormMaNhaTro(e.target.value)}
                      placeholder="Ví dụ: NT03"
                      className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-hidden focus:ring-2 focus:ring-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tên nhà trọ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formTenNhaTro}
                      onChange={(e) => setFormTenNhaTro(e.target.value)}
                      placeholder="Ví dụ: Nhà trọ Hướng Dương"
                      className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-hidden focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingAccount(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  {editingAccount ? 'Cập nhật tài khoản' : 'Lưu tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
