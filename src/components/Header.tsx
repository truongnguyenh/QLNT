import React from 'react';
import { LogOut, RefreshCw, KeyRound } from 'lucide-react';
import { TaiKhoan } from '../types/rental.ts';
import { SyncStatus } from '../services/rentalService.ts';

export type ActiveTabType =
  | 'overview'
  | 'rooms'
  | 'residents'
  | 'history'
  | 'accounts';

interface HeaderProps {
  currentUser: TaiKhoan;
  activeTab: ActiveTabType;
  onSelectTab: (tab: ActiveTabType) => void;
  onLogout: () => void;
  onOpenGasModal: () => void;
  onOpenChangePassword: () => void;
  syncStatus: SyncStatus;
  lastSyncTime: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab,
  onSelectTab,
  onLogout,
  onOpenGasModal,
  onOpenChangePassword,
  syncStatus,
  lastSyncTime,
}) => {
  const navItems: { id: ActiveTabType; label: string; adminOnly?: boolean }[] = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'rooms', label: 'Phòng trọ' },
    { id: 'residents', label: 'Nhân khẩu' },
    { id: 'history', label: 'Lịch sử' },
    { id: 'accounts', label: 'Tài khoản', adminOnly: true },
  ];

  const visibleNavItems = navItems.filter(
    (item) => !item.adminOnly || currentUser.Role === 'ADMIN'
  );

  const getSyncLabel = () => {
    if (syncStatus === 'syncing') {
      return 'Đang đồng bộ Sheet...';
    }
    if (syncStatus === 'synced') {
      return lastSyncTime
        ? `Đồng bộ thực tế (${lastSyncTime})`
        : 'Đồng bộ thực tế: Bật';
    }
    if (syncStatus === 'error') {
      return 'Lỗi đồng bộ Sheet';
    }
    return 'Kết nối Google Sheets';
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('overview')}
          className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer text-left"
        >
          Quản Lý Nhà Trọ
        </button>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Điều hướng chính"
          className="flex items-center gap-6 overflow-x-auto py-1 text-sm font-medium"
        >
          {visibleNavItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-slate-900 text-slate-900 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          {currentUser.Role === 'ADMIN' && (
            <button
              type="button"
              onClick={onOpenGasModal}
              className={`py-1 border-b-2 border-transparent font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
                syncStatus === 'error'
                  ? 'text-red-600 hover:text-red-800'
                  : syncStatus === 'synced' || syncStatus === 'syncing'
                  ? 'text-emerald-700 hover:text-emerald-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {syncStatus === 'syncing' && (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              )}
              <span className="font-mono tabular-nums text-xs sm:text-sm">
                {getSyncLabel()}
              </span>
            </button>
          )}
        </nav>

        {/* Zone 3: User context, Change Password & Logout */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 whitespace-nowrap mr-1">
            <span className="font-semibold text-slate-900">
              {currentUser.Username}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {currentUser.Role === 'ADMIN'
                ? 'Quản trị viên'
                : currentUser.TenNhaTro}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenChangePassword}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Đổi mật khẩu tài khoản"
            aria-label="Đổi mật khẩu tài khoản"
          >
            <KeyRound className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Đổi mật khẩu</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Đăng xuất khỏi hệ thống"
            aria-label="Đăng xuất khỏi hệ thống"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </header>
  );
};
