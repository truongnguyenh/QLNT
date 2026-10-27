import {
  TaiKhoan,
  Phong,
  NhanKhau,
} from '../types/rental.ts';
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_ROOMS,
  DEFAULT_RESIDENTS,
  validateResidentCapacity,
  processResidentMoveOut,
} from '../utils/rentalRules.ts';

const STORAGE_KEY = 'QUAN_LY_NHA_TRO_DATA_V2';
const GAS_URL_KEY = 'QUAN_LY_NHA_TRO_GAS_URL';
const USER_KEY = 'QUAN_LY_NHA_TRO_CURRENT_USER';

export interface RentalAppState {
  accounts: TaiKhoan[];
  rooms: Phong[];
  residents: NhanKhau[];
}

export type SyncStatus = 'disconnected' | 'syncing' | 'synced' | 'error';

export class RentalService {
  private static inFlightCount = 0;

  public static isMutating(): boolean {
    return this.inFlightCount > 0;
  }

  private static loadState(): RentalAppState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.accounts && parsed.rooms && parsed.residents) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Lỗi khi đọc LocalStorage, khởi tạo dữ liệu mẫu:', e);
    }
    const initial: RentalAppState = {
      accounts: DEFAULT_ACCOUNTS,
      rooms: DEFAULT_ROOMS,
      residents: DEFAULT_RESIDENTS,
    };
    RentalService.saveState(initial);
    return initial;
  }

  public static saveState(state: RentalAppState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Lỗi khi ghi LocalStorage:', e);
    }
  }

  public static getStoredGasUrl(): string {
    return (
      localStorage.getItem(GAS_URL_KEY) ||
      (import.meta.env && import.meta.env.VITE_GAS_WEB_APP_URL) ||
      ''
    );
  }

  public static setStoredGasUrl(url: string): void {
    localStorage.setItem(GAS_URL_KEY, url.trim());
  }

  public static getCurrentUser(): TaiKhoan | null {
    try {
      const sessionRaw =
        sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
      if (!sessionRaw) return null;
      const parsed = JSON.parse(sessionRaw) as TaiKhoan;
      return {
        ...parsed,
        Password: '',
      };
    } catch {
      return null;
    }
  }

  public static setCurrentUser(user: TaiKhoan | null): void {
    try {
      // Remove any legacy localStorage copy that might have contained a password
      localStorage.removeItem(USER_KEY);
      if (user) {
        const sanitized: TaiKhoan = {
          ...user,
          Password: '',
        };
        sessionStorage.setItem(USER_KEY, JSON.stringify(sanitized));
      } else {
        sessionStorage.removeItem(USER_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }

  public static getData(): RentalAppState {
    return this.loadState();
  }

  /**
   * Save or update a resident with strict capacity check
   */
  public static saveResident(resident: NhanKhau): {
    success: boolean;
    message?: string;
    updatedData?: RentalAppState;
    savedResident?: NhanKhau;
  } {
    const state = this.loadState();

    if (resident.TrangThai === 'Đang ở') {
      const capacityCheck = validateResidentCapacity(
        state.residents,
        resident.MaNhaTro,
        resident.TenPhong,
        resident.ID
      );
      if (!capacityCheck.valid) {
        return { success: false, message: capacityCheck.error };
      }
    }

    const finalResident: NhanKhau = {
      ...resident,
      ID: resident.ID || 'NK' + String(Date.now()).slice(-6),
    };

    const index = state.residents.findIndex((r) => r.ID === finalResident.ID);
    if (index >= 0) {
      state.residents[index] = finalResident;
    } else {
      state.residents.push(finalResident);
    }

    this.saveState(state);
    return { success: true, updatedData: state, savedResident: finalResident };
  }

  /**
   * Mark a resident as moved out ('Đã chuyển đi')
   */
  public static moveOutResident(
    residentId: string,
    ngayChuyenDi?: string
  ): {
    success: boolean;
    message?: string;
    updatedData?: RentalAppState;
    movedDate?: string;
  } {
    const state = this.loadState();
    const resident = state.residents.find((r) => r.ID === residentId);
    if (!resident) {
      return { success: false, message: 'Không tìm thấy nhân khẩu này.' };
    }

    const updated = processResidentMoveOut(resident, ngayChuyenDi);
    const index = state.residents.findIndex((r) => r.ID === residentId);
    state.residents[index] = updated;

    this.saveState(state);
    return {
      success: true,
      updatedData: state,
      movedDate: updated.NgayChuyenDi,
    };
  }

  /**
   * Delete a resident permanently
   */
  public static deleteResident(residentId: string): RentalAppState {
    const state = this.loadState();
    state.residents = state.residents.filter((r) => r.ID !== residentId);
    this.saveState(state);
    return state;
  }

  /**
   * Save or update a room
   */
  public static saveRoom(room: Phong): RentalAppState {
    const state = this.loadState();
    const index = state.rooms.findIndex((r) => r.MaPhong === room.MaPhong);
    if (index >= 0) {
      state.rooms[index] = room;
    } else {
      state.rooms.push(room);
    }
    this.saveState(state);
    return state;
  }

  /**
   * Delete room
   */
  public static deleteRoom(maPhong: string): {
    success: boolean;
    message?: string;
    updatedData?: RentalAppState;
  } {
    const state = this.loadState();
    const targetRoom = state.rooms.find((r) => r.MaPhong === maPhong);
    if (!targetRoom) {
      return { success: false, message: 'Phòng không tồn tại' };
    }

    const hasOccupants = state.residents.some(
      (r) =>
        r.MaNhaTro === targetRoom.MaNhaTro &&
        r.TenPhong.trim().toLowerCase() ===
          targetRoom.TenPhong.trim().toLowerCase() &&
        r.TrangThai === 'Đang ở'
    );

    if (hasOccupants) {
      return {
        success: false,
        message:
          'Không thể xóa phòng đang có người cư trú! Vui lòng chuyển người đi trước khi xóa phòng.',
      };
    }

    state.rooms = state.rooms.filter((r) => r.MaPhong !== maPhong);
    this.saveState(state);
    return { success: true, updatedData: state };
  }

  /**
   * Create or update an account (Admin only)
   */
  public static saveAccount(account: TaiKhoan): RentalAppState {
    const state = this.loadState();
    const index = state.accounts.findIndex(
      (a) => a.Username.toLowerCase() === account.Username.toLowerCase()
    );
    if (index >= 0) {
      state.accounts[index] = account;
    } else {
      state.accounts.push(account);
    }
    this.saveState(state);
    return state;
  }

  /**
   * Delete an account (Admin only, prevents deleting the last ADMIN account)
   */
  public static deleteAccount(username: string): {
    success: boolean;
    message?: string;
    updatedData?: RentalAppState;
  } {
    const state = this.loadState();
    const target = state.accounts.find(
      (a) => a.Username.toLowerCase() === username.toLowerCase()
    );
    if (!target) {
      return { success: false, message: 'Không tìm thấy tài khoản.' };
    }

    if (target.Role === 'ADMIN') {
      const adminCount = state.accounts.filter((a) => a.Role === 'ADMIN').length;
      if (adminCount <= 1) {
        return {
          success: false,
          message: 'Không thể xóa tài khoản Quản trị viên duy nhất của hệ thống.',
        };
      }
    }

    state.accounts = state.accounts.filter(
      (a) => a.Username.toLowerCase() !== username.toLowerCase()
    );
    this.saveState(state);
    return { success: true, updatedData: state };
  }

  /**
   * Change password for the currently logged-in user
   */
  public static changePassword(
    username: string,
    currentPassword: string,
    newPassword: string
  ): {
    success: boolean;
    message?: string;
    updatedData?: RentalAppState;
    updatedAccount?: TaiKhoan;
  } {
    const state = this.loadState();
    const index = state.accounts.findIndex(
      (a) => a.Username.toLowerCase() === username.toLowerCase()
    );
    if (index < 0) {
      return { success: false, message: 'Không tìm thấy tài khoản.' };
    }

    const existing = state.accounts[index];
    if (String(existing.Password) !== currentPassword) {
      return {
        success: false,
        message: 'Mật khẩu hiện tại không chính xác.',
      };
    }

    const updatedAccount: TaiKhoan = {
      ...existing,
      Password: newPassword.trim(),
    };
    state.accounts[index] = updatedAccount;
    this.saveState(state);

    return {
      success: true,
      updatedData: state,
      updatedAccount,
    };
  }

  /**
   * Send a real-time mutation action to Google Apps Script Web App
   * Uses text/plain to avoid CORS preflight OPTIONS failure on Google Apps Script
   */
  public static async sendMutationToGoogleSheets(
    url: string,
    payload: Record<string, unknown>
  ): Promise<{
    success: boolean;
    message?: string;
    data?: RentalAppState;
  }> {
    if (!url || !url.startsWith('http')) {
      return { success: false, message: 'Chưa cấu hình URL Google Sheets' };
    }

    this.inFlightCount++;
    try {
      const res = await fetch(url.trim(), {
        method: 'POST',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.status === 'success') {
        if (json.data && json.data.accounts && json.data.rooms && json.data.residents) {
          const remoteState: RentalAppState = {
            accounts: json.data.accounts,
            rooms: json.data.rooms,
            residents: json.data.residents,
          };
          this.saveState(remoteState);
          return {
            success: true,
            message: json.message || 'Đã đồng bộ thời gian thực lên Google Sheets',
            data: remoteState,
          };
        }
        return {
          success: true,
          message: json.message || 'Đã đồng bộ thời gian thực lên Google Sheets',
        };
      }
      return {
        success: false,
        message: json.message || 'Lỗi từ Google Apps Script',
      };
    } catch (e: any) {
      return {
        success: false,
        message: `Lỗi đồng bộ: ${e.message || e}`,
      };
    } finally {
      this.inFlightCount = Math.max(0, this.inFlightCount - 1);
    }
  }

  /**
   * Test connection to Google Apps Script Web App (No custom headers on GET to avoid CORS preflight)
   */
  public static async testGoogleAppsScriptConnection(url: string): Promise<{
    success: boolean;
    message: string;
  }> {
    if (!url || !url.startsWith('http')) {
      return { success: false, message: 'URL Google Apps Script không hợp lệ.' };
    }

    try {
      const cleanUrl = url.trim();
      const separator = cleanUrl.includes('?') ? '&' : '?';
      const fetchUrl = `${cleanUrl}${separator}action=ping&t=${Date.now()}`;
      const res = await fetch(fetchUrl, {
        method: 'GET',
        redirect: 'follow',
      });
      const data = await res.json();
      if (data.status === 'success') {
        return {
          success: true,
          message:
            'Kết nối Google Sheets thời gian thực thành công! ' +
            (data.message || ''),
        };
      }
      return {
        success: true,
        message:
          'Kết nối được đến URL nhưng phản hồi không chuẩn: ' +
          JSON.stringify(data),
      };
    } catch (e: any) {
      return {
        success: false,
        message: `Không thể kết nối tới Google Apps Script: ${
          e.message || e
        }. Hãy đảm bảo bạn đã Deploy Web App với quyền truy cập "Bất kỳ ai (Anyone)".`,
      };
    }
  }

  /**
   * Pull all data from Google Sheets via Apps Script Web App
   * Uses cache-busting timestamp and zero custom headers for seamless CORS
   */
  public static async pullFromGoogleSheets(url: string): Promise<{
    success: boolean;
    message: string;
    data?: RentalAppState;
  }> {
    if (!url || !url.startsWith('http')) {
      return { success: false, message: 'URL không hợp lệ' };
    }

    try {
      const cleanUrl = url.trim();
      const separator = cleanUrl.includes('?') ? '&' : '?';
      const fetchUrl = `${cleanUrl}${separator}action=getAllData&t=${Date.now()}`;
      const res = await fetch(fetchUrl, {
        method: 'GET',
        redirect: 'follow',
      });
      const json = await res.json();

      if (json.status === 'success' && json.data) {
        const fetchedData: RentalAppState = {
          accounts:
            json.data.accounts && json.data.accounts.length > 0
              ? json.data.accounts
              : DEFAULT_ACCOUNTS,
          rooms: json.data.rooms || [],
          residents: json.data.residents || [],
        };
        if (!this.isMutating()) {
          this.saveState(fetchedData);
        }
        return {
          success: true,
          message: 'Đã đồng bộ dữ liệu mới nhất từ Google Sheets!',
          data: fetchedData,
        };
      }
      return {
        success: false,
        message: json.message || 'Không thể đọc dữ liệu từ Google Sheets',
      };
    } catch (e: any) {
      return {
        success: false,
        message: `Lỗi kết nối tải dữ liệu: ${e.message || e}`,
      };
    }
  }

  /**
   * Push entire state to Google Sheets via Apps Script Web App
   */
  public static async pushToGoogleSheets(
    url: string,
    data: RentalAppState
  ): Promise<{ success: boolean; message: string }> {
    return this.sendMutationToGoogleSheets(url, {
      action: 'syncAll',
      data: data,
    }) as Promise<{ success: boolean; message: string }>;
  }
}
