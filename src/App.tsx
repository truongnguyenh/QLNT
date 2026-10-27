import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  TaiKhoan,
  Phong,
  NhanKhau,
} from './types/rental.ts';
import {
  RentalService,
  RentalAppState,
  SyncStatus,
} from './services/rentalService.ts';
import {
  getAuthorizedRooms,
  getAuthorizedResidents,
  getDistinctBoardingHouses,
  canUserAccessBoardingHouse,
  validatePasswordStrength,
} from './utils/rentalRules.ts';
import { Header, ActiveTabType } from './components/Header.tsx';
import { AuthScreen } from './components/AuthScreen.tsx';
import { DashboardOverview } from './components/DashboardOverview.tsx';
import { RoomList } from './components/RoomList.tsx';
import { ResidentList } from './components/ResidentList.tsx';
import { ResidentModal } from './components/ResidentModal.tsx';
import { MoveOutHistory } from './components/MoveOutHistory.tsx';
import { AccountManagement } from './components/AccountManagement.tsx';
import { GoogleAppsScriptModal } from './components/GoogleAppsScriptModal.tsx';

export default function App() {
  const [data, setData] = useState<RentalAppState>(() => RentalService.getData());
  const [currentUser, setCurrentUser] = useState<TaiKhoan | null>(() =>
    RentalService.getCurrentUser()
  );
  const [gasUrl, setGasUrl] = useState<string>(() =>
    RentalService.getStoredGasUrl()
  );

  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() =>
    RentalService.getStoredGasUrl() ? 'synced' : 'disconnected'
  );
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTabType>('overview');
  const [adminFilterNhaTro, setAdminFilterNhaTro] = useState<string>('ALL');

  const [isGasModalOpen, setIsGasModalOpen] = useState(false);
  const [isResidentModalOpen, setIsResidentModalOpen] = useState(false);
  const [residentToEdit, setResidentToEdit] = useState<NhanKhau | null>(null);
  const [defaultRoomForAdd, setDefaultRoomForAdd] = useState<Phong | null>(null);

  // Change Password Modal state
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [oldPasswordInput, setOldPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [changePassError, setChangePassError] = useState<string | null>(null);

  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const gasUrlRef = useRef(gasUrl);
  useEffect(() => {
    gasUrlRef.current = gasUrl;
  }, [gasUrl]);

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const formatNowTime = () => {
    return new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  /**
   * Background real-time pull from Google Sheets
   */
  const pullFromCloudSilent = useCallback(async (targetUrl?: string) => {
    const urlToUse = (targetUrl !== undefined ? targetUrl : gasUrlRef.current).trim();
    if (!urlToUse || !urlToUse.startsWith('http')) {
      setSyncStatus('disconnected');
      return;
    }
    if (RentalService.isMutating()) return;

    setSyncStatus('syncing');
    const result = await RentalService.pullFromGoogleSheets(urlToUse);
    if (result.success && result.data) {
      if (!RentalService.isMutating()) {
        setData(result.data);
      }
      setSyncStatus('synced');
      setLastSyncTime(formatNowTime());
    } else {
      setSyncStatus('error');
    }
  }, []);

  /**
   * Push every mutation in real time to Google Sheets when gasUrl is configured
   */
  const triggerRealtimeMutation = useCallback(
    async (payload: Record<string, unknown>) => {
      const urlToUse = gasUrlRef.current.trim();
      if (!urlToUse || !urlToUse.startsWith('http')) return;

      setSyncStatus('syncing');
      const res = await RentalService.sendMutationToGoogleSheets(urlToUse, payload);
      if (res.success) {
        if (res.data) {
          setData(res.data);
        }
        setSyncStatus('synced');
        setLastSyncTime(formatNowTime());
      } else {
        setSyncStatus('error');
        showToast(res.message || 'Lỗi đồng bộ lên Google Sheets.', 'error');
      }
    },
    []
  );

  /**
   * Set up automatic real-time polling (every 10 seconds + on tab focus)
   */
  useEffect(() => {
    if (!gasUrl || !gasUrl.startsWith('http')) {
      setSyncStatus('disconnected');
      return;
    }

    pullFromCloudSilent(gasUrl);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !RentalService.isMutating()) {
        pullFromCloudSilent();
      }
    }, 10000);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && !RentalService.isMutating()) {
        pullFromCloudSilent();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [gasUrl, pullFromCloudSilent]);

  /**
   * Verify active session against latest account list (auto-logout if account was revoked/deleted)
   */
  useEffect(() => {
    if (!currentUser) return;
    const latestAcc = data.accounts.find(
      (a) => a.Username.toLowerCase() === currentUser.Username.toLowerCase()
    );
    if (!latestAcc) {
      setCurrentUser(null);
      RentalService.setCurrentUser(null);
      return;
    }
    if (
      latestAcc.Role !== currentUser.Role ||
      latestAcc.MaNhaTro !== currentUser.MaNhaTro ||
      latestAcc.TenNhaTro !== currentUser.TenNhaTro
    ) {
      const updatedSession: TaiKhoan = { ...latestAcc, Password: '' };
      setCurrentUser(updatedSession);
      RentalService.setCurrentUser(updatedSession);
    }
  }, [data.accounts, currentUser]);

  useEffect(() => {
    if (currentUser && currentUser.Role !== 'ADMIN' && activeTab === 'accounts') {
      setActiveTab('overview');
    }
  }, [currentUser, activeTab]);

  const handleLoginSuccess = (user: TaiKhoan) => {
    const sanitized: TaiKhoan = { ...user, Password: '' };
    setCurrentUser(sanitized);
    RentalService.setCurrentUser(sanitized);
    showToast(`Đăng nhập thành công (${user.Username}).`, 'success');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    RentalService.setCurrentUser(null);
    setIsGasModalOpen(false);
    setIsChangePassOpen(false);
    setActiveTab('overview');
  };

  const handleSaveGasUrl = (url: string) => {
    if (!currentUser || currentUser.Role !== 'ADMIN') return;
    const clean = url.trim();
    setGasUrl(clean);
    RentalService.setStoredGasUrl(clean);
    if (!clean) {
      setSyncStatus('disconnected');
      setLastSyncTime(null);
    }
  };

  const handleDataLoadedFromSheets = (newData: RentalAppState) => {
    setData(newData);
    setSyncStatus('synced');
    setLastSyncTime(formatNowTime());
    showToast('Đã đồng bộ dữ liệu thời gian thực từ Google Sheets!', 'success');
  };

  const handleSaveRoom = (room: Phong) => {
    if (!currentUser) return;
    const enforcedRoom: Phong =
      currentUser.Role === 'ADMIN'
        ? room
        : {
            ...room,
            MaNhaTro: currentUser.MaNhaTro,
            TenNhaTro: currentUser.TenNhaTro,
          };

    if (!canUserAccessBoardingHouse(currentUser, enforcedRoom.MaNhaTro)) {
      showToast('Bạn không có quyền thao tác trên nhà trọ này.', 'error');
      return;
    }

    const updated = RentalService.saveRoom(enforcedRoom);
    setData(updated);
    showToast(`Đã lưu ${enforcedRoom.TenPhong}.`, 'success');
    triggerRealtimeMutation({ action: 'saveRoom', room: enforcedRoom });
  };

  const handleDeleteRoom = (maPhong: string) => {
    if (!currentUser) return;
    const targetRoom = data.rooms.find((r) => r.MaPhong === maPhong);
    if (!targetRoom || !canUserAccessBoardingHouse(currentUser, targetRoom.MaNhaTro)) {
      showToast('Bạn không có quyền xóa phòng này.', 'error');
      return;
    }

    if (window.confirm('Bạn có chắc muốn xóa phòng này?')) {
      const res = RentalService.deleteRoom(maPhong);
      if (res.success && res.updatedData) {
        setData(res.updatedData);
        showToast('Đã xóa phòng thành công.', 'success');
        triggerRealtimeMutation({ action: 'deleteRoom', maPhong });
      } else {
        showToast(res.message || 'Không thể xóa phòng.', 'error');
      }
    }
  };

  const handleOpenAddResident = (room?: Phong) => {
    setResidentToEdit(null);
    setDefaultRoomForAdd(room || null);
    setIsResidentModalOpen(true);
  };

  const handleOpenEditResident = (resident: NhanKhau) => {
    if (!canUserAccessBoardingHouse(currentUser, resident.MaNhaTro)) {
      showToast('Bạn không có quyền chỉnh sửa nhân khẩu này.', 'error');
      return;
    }
    setResidentToEdit(resident);
    setDefaultRoomForAdd(null);
    setIsResidentModalOpen(true);
  };

  const handleSaveResident = (
    resident: NhanKhau
  ): { success: boolean; message?: string } => {
    if (!currentUser) {
      return { success: false, message: 'Phiên đăng nhập không hợp lệ.' };
    }
    const enforcedResident: NhanKhau =
      currentUser.Role === 'ADMIN'
        ? resident
        : {
            ...resident,
            MaNhaTro: currentUser.MaNhaTro,
            TenNhaTro: currentUser.TenNhaTro,
          };

    if (!canUserAccessBoardingHouse(currentUser, enforcedResident.MaNhaTro)) {
      return {
        success: false,
        message: 'Bạn không có quyền thêm hoặc sửa nhân khẩu ngoài phạm vi nhà trọ của mình.',
      };
    }

    const res = RentalService.saveResident(enforcedResident);
    if (res.success && res.updatedData && res.savedResident) {
      setData(res.updatedData);
      showToast(
        residentToEdit
          ? 'Đã cập nhật thông tin nhân khẩu.'
          : 'Đã thêm nhân khẩu vào phòng thành công.',
        'success'
      );
      triggerRealtimeMutation({
        action: 'saveResident',
        resident: res.savedResident,
      });
      return { success: true };
    }
    return { success: false, message: res.message };
  };

  const handleMoveOutResident = (residentId: string, ngayChuyenDi?: string) => {
    const target = data.residents.find((r) => r.ID === residentId);
    if (!target || !canUserAccessBoardingHouse(currentUser, target.MaNhaTro)) {
      showToast('Bạn không có quyền thao tác trên nhân khẩu này.', 'error');
      return;
    }

    const res = RentalService.moveOutResident(residentId, ngayChuyenDi);
    if (res.success && res.updatedData) {
      setData(res.updatedData);
      showToast(
        'Đã chuyển nhân khẩu sang Lịch sử và giải phóng chỗ trống.',
        'success'
      );
      triggerRealtimeMutation({
        action: 'moveOutResident',
        id: residentId,
        ngayChuyenDi: res.movedDate,
      });
    } else {
      showToast(res.message || 'Lỗi khi cập nhật chuyển đi.', 'error');
    }
  };

  const handleDeleteResident = (residentId: string) => {
    const target = data.residents.find((r) => r.ID === residentId);
    if (!target || !canUserAccessBoardingHouse(currentUser, target.MaNhaTro)) {
      showToast('Bạn không có quyền xóa hồ sơ nhân khẩu này.', 'error');
      return;
    }

    if (window.confirm('Xác nhận xóa vĩnh viễn hồ sơ nhân khẩu này?')) {
      const updated = RentalService.deleteResident(residentId);
      setData(updated);
      showToast('Đã xóa hồ sơ nhân khẩu.', 'info');
      triggerRealtimeMutation({
        action: 'deleteResident',
        id: residentId,
      });
    }
  };

  const handleToggleTamTru = (resident: NhanKhau) => {
    if (!canUserAccessBoardingHouse(currentUser, resident.MaNhaTro)) {
      showToast('Bạn không có quyền thay đổi hồ sơ này.', 'error');
      return;
    }

    const nextStatus =
      resident.TamTru === 'Đã khai báo' ? 'Chưa khai báo' : 'Đã khai báo';
    const updatedResident: NhanKhau = {
      ...resident,
      TamTru: nextStatus,
    };
    const res = RentalService.saveResident(updatedResident);
    if (res.success && res.updatedData && res.savedResident) {
      setData(res.updatedData);
      showToast(`Trạng thái tạm trú: ${nextStatus}`, 'info');
      triggerRealtimeMutation({
        action: 'saveResident',
        resident: res.savedResident,
      });
    }
  };

  const handleSaveAccount = (account: TaiKhoan) => {
    if (!currentUser || currentUser.Role !== 'ADMIN') {
      showToast('Chỉ Quản trị viên mới có quyền quản lý tài khoản.', 'error');
      return;
    }
    const updated = RentalService.saveAccount(account);
    setData(updated);
    showToast(`Đã lưu tài khoản "${account.Username}".`, 'success');
    triggerRealtimeMutation({
      action: 'saveAccount',
      account,
    });
  };

  const handleDeleteAccount = (username: string) => {
    if (!currentUser || currentUser.Role !== 'ADMIN') return;
    if (username.toLowerCase() === currentUser.Username.toLowerCase()) {
      showToast('Không thể tự xóa tài khoản đang đăng nhập.', 'error');
      return;
    }
    if (window.confirm(`Xác nhận xóa tài khoản "${username}"?`)) {
      const res = RentalService.deleteAccount(username);
      if (res.success && res.updatedData) {
        setData(res.updatedData);
        showToast(`Đã xóa tài khoản "${username}".`, 'info');
        triggerRealtimeMutation({
          action: 'deleteAccount',
          username,
        });
      } else {
        showToast(res.message || 'Không thể xóa tài khoản.', 'error');
      }
    }
  };

  const handleChangeOwnPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setChangePassError(null);

    const strength = validatePasswordStrength(newPasswordInput);
    if (!strength.valid) {
      setChangePassError(strength.error || 'Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (newPasswordInput.trim() !== confirmPasswordInput.trim()) {
      setChangePassError('Mật khẩu xác nhận không khớp.');
      return;
    }

    const res = RentalService.changePassword(
      currentUser.Username,
      oldPasswordInput,
      newPasswordInput
    );

    if (res.success && res.updatedData && res.updatedAccount) {
      setData(res.updatedData);
      setIsChangePassOpen(false);
      setOldPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      showToast('Đã đổi mật khẩu thành công!', 'success');
      triggerRealtimeMutation({
        action: 'saveAccount',
        account: res.updatedAccount,
      });
    } else {
      setChangePassError(res.message || 'Không thể đổi mật khẩu.');
    }
  };

  if (!currentUser) {
    return (
      <AuthScreen
        accounts={data.accounts}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  const authorizedRooms = getAuthorizedRooms(
    data.rooms,
    currentUser,
    adminFilterNhaTro
  );
  const authorizedResidents = getAuthorizedResidents(
    data.residents,
    currentUser,
    adminFilterNhaTro
  );
  const boardingHouses = getDistinctBoardingHouses(data.rooms, data.accounts);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* 3-Zone Top Bar */}
      <Header
        currentUser={currentUser}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onLogout={handleLogout}
        onOpenGasModal={() => {
          if (currentUser.Role === 'ADMIN') {
            setIsGasModalOpen(true);
          }
        }}
        onOpenChangePassword={() => {
          setChangePassError(null);
          setOldPasswordInput('');
          setNewPasswordInput('');
          setConfirmPasswordInput('');
          setIsChangePassOpen(true);
        }}
        syncStatus={syncStatus}
        lastSyncTime={lastSyncTime}
      />

      {/* Main Workspace Viewport */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {activeTab === 'overview' && (
          <DashboardOverview
            rooms={authorizedRooms}
            residents={authorizedResidents}
            currentUser={currentUser}
            selectedFilterNhaTro={adminFilterNhaTro}
            onSelectFilterNhaTro={setAdminFilterNhaTro}
            boardingHouses={boardingHouses}
            onNavigateToTab={(tab) => setActiveTab(tab as ActiveTabType)}
            onOpenAddResident={handleOpenAddResident}
            onToggleTamTru={handleToggleTamTru}
          />
        )}

        {activeTab === 'rooms' && (
          <RoomList
            rooms={authorizedRooms}
            residents={authorizedResidents}
            currentUser={currentUser}
            boardingHouses={boardingHouses}
            onAddResidentToRoom={handleOpenAddResident}
            onSaveRoom={handleSaveRoom}
            onDeleteRoom={handleDeleteRoom}
            onMoveOutResident={handleMoveOutResident}
            selectedFilterNhaTro={adminFilterNhaTro}
            onSelectFilterNhaTro={setAdminFilterNhaTro}
          />
        )}

        {activeTab === 'residents' && (
          <ResidentList
            residents={authorizedResidents}
            rooms={authorizedRooms}
            currentUser={currentUser}
            boardingHouses={boardingHouses}
            onOpenAddModal={() => handleOpenAddResident()}
            onEditResident={handleOpenEditResident}
            onDeleteResident={handleDeleteResident}
            onMoveOutResident={handleMoveOutResident}
            onToggleTamTru={handleToggleTamTru}
            selectedFilterNhaTro={adminFilterNhaTro}
            onSelectFilterNhaTro={setAdminFilterNhaTro}
          />
        )}

        {activeTab === 'history' && (
          <MoveOutHistory
            residents={authorizedResidents}
            rooms={authorizedRooms}
            onDeleteResident={handleDeleteResident}
          />
        )}

        {activeTab === 'accounts' && currentUser.Role === 'ADMIN' && (
          <AccountManagement
            accounts={data.accounts}
            currentUser={currentUser}
            onSaveAccount={handleSaveAccount}
            onDeleteAccount={handleDeleteAccount}
          />
        )}
      </main>

      {/* Clean Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>Hệ thống Quản Lý Nhà Trọ</span>
            <span aria-hidden="true">·</span>
            <span>
              {syncStatus === 'synced'
                ? `Đồng bộ thời gian thực (${lastSyncTime || 'Đang bật'})`
                : syncStatus === 'syncing'
                ? 'Đang đồng bộ dữ liệu...'
                : 'Chế độ lưu trữ cục bộ'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {gasUrl && (
              <button
                type="button"
                onClick={() => pullFromCloudSilent()}
                className="text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    syncStatus === 'syncing' ? 'animate-spin' : ''
                  }`}
                />
                <span>Làm mới dữ liệu</span>
              </button>
            )}
            {currentUser.Role === 'ADMIN' && (
              <button
                type="button"
                onClick={() => setIsGasModalOpen(true)}
                className="text-slate-800 hover:text-slate-950 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cấu hình Đồng bộ & Xuất ứng dụng</span>
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Add / Edit Resident Modal */}
      <ResidentModal
        isOpen={isResidentModalOpen}
        onClose={() => setIsResidentModalOpen(false)}
        onSave={handleSaveResident}
        residentToEdit={residentToEdit}
        defaultRoom={defaultRoomForAdd}
        rooms={authorizedRooms}
        residents={authorizedResidents}
        currentUser={currentUser}
        boardingHouses={boardingHouses}
      />

      {/* Export & Google Apps Script Modal (ADMIN ONLY) */}
      {currentUser.Role === 'ADMIN' && (
        <GoogleAppsScriptModal
          isOpen={isGasModalOpen}
          onClose={() => setIsGasModalOpen(false)}
          gasUrl={gasUrl}
          onSaveGasUrl={handleSaveGasUrl}
          currentData={data}
          onDataLoadedFromSheets={handleDataLoadedFromSheets}
          syncStatus={syncStatus}
          lastSyncTime={lastSyncTime}
        />
      )}

      {/* Self-service Change Password Modal */}
      {isChangePassOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Đổi mật khẩu tài khoản
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Tài khoản: <span className="font-mono font-semibold text-slate-800">{currentUser.Username}</span>
            </p>

            {changePassError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{changePassError}</span>
              </div>
            )}

            <form onSubmit={handleChangeOwnPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật khẩu hiện tại <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={oldPasswordInput}
                  onChange={(e) => setOldPasswordInput(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-hidden focus:ring-2 focus:ring-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật khẩu mới (Tối thiểu 6 ký tự) <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Nhập mật khẩu mới (>= 6 ký tự)"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-hidden focus:ring-2 focus:ring-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-hidden focus:ring-2 focus:ring-slate-900 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangePassOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  Cập nhật mật khẩu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50">
          <div
            className={`px-4 py-3 rounded-lg shadow-lg text-xs font-semibold flex items-center gap-2 border ${
              toast.type === 'success'
                ? 'bg-slate-900 text-white border-slate-800'
                : toast.type === 'error'
                ? 'bg-red-600 text-white border-red-500'
                : 'bg-slate-800 text-white border-slate-700'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-white" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
