/**
 * Google Apps Script backend code (Code.gs)
 * Ready to be copied and pasted directly into Google Apps Script editor.
 * Supports BOTH:
 * 1) Direct Web App hosting via HtmlService (Index.html) with google.script.run
 * 2) External REST JSON API via doGet / doPost for standalone/hosted Web Apps
 */

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT BACKEND: HỆ THỐNG QUẢN LÝ NHÀ TRỌ
 * =========================================================================
 * Tự động khởi tạo Google Sheets nếu chưa có:
 * - Sheet 'TaiKhoan': Username, Password, Role, MaNhaTro, TenNhaTro
 * - Sheet 'Phong': MaPhong, MaNhaTro, TenNhaTro, TenPhong, GhiChu
 * - Sheet 'NhanKhau': ID, MaNhaTro, TenNhaTro, TenPhong, HoTen, NgaySinh, GioiTinh, QueQuan, NgayVaoO, TamTru, TrangThai, NgayChuyenDi
 */

const SHEET_NAMES = {
  TAI_KHOAN: 'TaiKhoan',
  PHONG: 'Phong',
  NHAN_KHAU: 'NhanKhau'
};

const MAX_OCCUPANTS_PER_ROOM = 4;

/**
 * Xử lý GET request:
 * - Nếu có tham số ?action=... thì trả về JSON API cho ứng dụng bên ngoài.
 * - Nếu truy cập trực tiếp bằng trình duyệt thì hiển thị giao diện Index.html.
 */
function doGet(e) {
  initDatabase();
  const action = e && e.parameter && e.parameter.action;

  if (action === 'ping') {
    return createJsonResponse({
      status: 'success',
      message: 'Kết nối Google Apps Script & Google Sheets hoạt động tốt!',
      timestamp: new Date().toISOString()
    });
  }

  if (action === 'init') {
    return createJsonResponse(initDatabase());
  }

  if (action === 'getAllData') {
    return createJsonResponse({
      status: 'success',
      data: getAllDataFromSheets()
    });
  }

  // Mặc định trả về giao diện Index.html nếu người dùng tạo file Index.html trên Apps Script
  try {
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('Hệ Thống Quản Lý Nhà Trọ')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (err) {
    return createJsonResponse({
      status: 'success',
      message: 'Backend Google Apps Script đã sẵn sàng. Hãy kết nối từ ứng dụng Web hoặc thêm file Index.html.'
    });
  }
}

/**
 * Xử lý POST request từ ứng dụng Web bên ngoài
 */
function doPost(e) {
  try {
    initDatabase();
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }

    const action = payload.action;

    if (action === 'initDatabase') {
      return createJsonResponse(initDatabase());
    }
    if (action === 'getAllData') {
      return createJsonResponse({ status: 'success', data: getAllDataFromSheets() });
    }
    if (action === 'saveResident') {
      return createJsonResponse(handleSaveResident(payload.resident));
    }
    if (action === 'moveOutResident') {
      return createJsonResponse(handleMoveOutResident(payload.id, payload.ngayChuyenDi));
    }
    if (action === 'deleteResident') {
      return createJsonResponse(handleDeleteResident(payload.id));
    }
    if (action === 'saveRoom') {
      return createJsonResponse(handleSaveRoom(payload.room));
    }
    if (action === 'deleteRoom') {
      return createJsonResponse(handleDeleteRoom(payload.maPhong));
    }
    if (action === 'saveAccount') {
      return createJsonResponse(handleSaveAccount(payload.account));
    }
    if (action === 'deleteAccount') {
      return createJsonResponse(handleDeleteAccount(payload.username));
    }
    if (action === 'syncAll') {
      return createJsonResponse(handleSyncAll(payload.data));
    }

    return createJsonResponse({ status: 'error', message: 'Action không hợp lệ: ' + action });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * Các hàm gọi trực tiếp từ google.script.run trong file Index.html
 */
function clientGetAllData() {
  initDatabase();
  return getAllDataFromSheets();
}

function clientSaveResident(resident) {
  return handleSaveResident(resident);
}

function clientMoveOutResident(id, ngayChuyenDi) {
  return handleMoveOutResident(id, ngayChuyenDi);
}

function clientDeleteResident(id) {
  return handleDeleteResident(id);
}

function clientSaveRoom(room) {
  return handleSaveRoom(room);
}

function clientDeleteRoom(maPhong) {
  return handleDeleteRoom(maPhong);
}

function clientSaveAccount(account) {
  return handleSaveAccount(account);
}

function clientDeleteAccount(username) {
  return handleDeleteAccount(username);
}

/**
 * Khởi tạo 3 sheets kèm tiêu đề chuẩn nếu chưa tồn tại
 */
function initDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Sheet TaiKhoan
  let sheetTaiKhoan = ss.getSheetByName(SHEET_NAMES.TAI_KHOAN);
  if (!sheetTaiKhoan) {
    sheetTaiKhoan = ss.insertSheet(SHEET_NAMES.TAI_KHOAN);
    sheetTaiKhoan.appendRow(['Username', 'Password', 'Role', 'MaNhaTro', 'TenNhaTro']);
    sheetTaiKhoan.appendRow(['admin', 'admin123', 'ADMIN', 'ALL', 'Tất cả nhà trọ']);
    sheetTaiKhoan.appendRow(['chutro1', '123456', 'USER', 'NT01', 'Nhà trọ Bình An']);
    sheetTaiKhoan.appendRow(['chutro2', '123456', 'USER', 'NT02', 'Nhà trọ Hưng Thịnh']);
    sheetTaiKhoan.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#F1F5F9');
  }

  // 2. Sheet Phong
  let sheetPhong = ss.getSheetByName(SHEET_NAMES.PHONG);
  if (!sheetPhong) {
    sheetPhong = ss.insertSheet(SHEET_NAMES.PHONG);
    sheetPhong.appendRow(['MaPhong', 'MaNhaTro', 'TenNhaTro', 'TenPhong', 'GhiChu']);
    sheetPhong.appendRow(['NT01-P101', 'NT01', 'Nhà trọ Bình An', 'Phòng 101', 'Tầng 1 - Mặt tiền, có máy lạnh']);
    sheetPhong.appendRow(['NT01-P102', 'NT01', 'Nhà trọ Bình An', 'Phòng 102', 'Tầng 1 - Gác lửng']);
    sheetPhong.appendRow(['NT01-P201', 'NT01', 'Nhà trọ Bình An', 'Phòng 201', 'Tầng 2 - Có ban công']);
    sheetPhong.appendRow(['NT02-P1', 'NT02', 'Nhà trọ Hưng Thịnh', 'Phòng 01', 'Dãy A, diện tích 22m2']);
    sheetPhong.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#F1F5F9');
  }

  // 3. Sheet NhanKhau
  let sheetNhanKhau = ss.getSheetByName(SHEET_NAMES.NHAN_KHAU);
  if (!sheetNhanKhau) {
    sheetNhanKhau = ss.insertSheet(SHEET_NAMES.NHAN_KHAU);
    sheetNhanKhau.appendRow([
      'ID', 'MaNhaTro', 'TenNhaTro', 'TenPhong', 'HoTen',
      'NgaySinh', 'GioiTinh', 'QueQuan', 'NgayVaoO',
      'TamTru', 'TrangThai', 'NgayChuyenDi'
    ]);
    sheetNhanKhau.appendRow([
      'NK001', 'NT01', 'Nhà trọ Bình An', 'Phòng 101', 'Nguyễn Văn An',
      '1998-05-12', 'Nam', 'Hà Nam', '2023-08-01',
      'Đã khai báo', 'Đang ở', ''
    ]);
    sheetNhanKhau.getRange(1, 1, 1, 12).setFontWeight('bold').setBackground('#F1F5F9');
  }

  return { status: 'success', message: 'Đã khởi tạo 3 Sheets: TaiKhoan, Phong, NhanKhau.' };
}

function getAllDataFromSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    accounts: readSheetAsObjects(ss.getSheetByName(SHEET_NAMES.TAI_KHOAN)),
    rooms: readSheetAsObjects(ss.getSheetByName(SHEET_NAMES.PHONG)),
    residents: readSheetAsObjects(ss.getSheetByName(SHEET_NAMES.NHAN_KHAU))
  };
}

function readSheetAsObjects(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0] && !row[1]) continue;
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      let val = row[j];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      obj[headers[j]] = val !== undefined && val !== null ? String(val).trim() : '';
    }
    rows.push(obj);
  }
  return rows;
}

function handleSaveResident(resident) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.NHAN_KHAU);
  const data = sheet.getDataRange().getValues();

  let countActive = 0;
  for (let i = 1; i < data.length; i++) {
    const rowId = String(data[i][0]).trim();
    const rowMaNT = String(data[i][1]).trim();
    const rowTenPhong = String(data[i][3]).trim();
    const rowTrangThai = String(data[i][10]).trim();

    if (
      rowId !== resident.ID &&
      rowMaNT === resident.MaNhaTro &&
      rowTenPhong.toLowerCase() === resident.TenPhong.toLowerCase() &&
      rowTrangThai === 'Đang ở'
    ) {
      countActive++;
    }
  }

  if (resident.TrangThai === 'Đang ở' && countActive >= MAX_OCCUPANTS_PER_ROOM) {
    return {
      status: 'error',
      message: 'Phòng ' + resident.TenPhong + ' đã đủ tối đa ' + MAX_OCCUPANTS_PER_ROOM + ' người đang ở!'
    };
  }

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === resident.ID) {
      rowIndex = i + 1;
      break;
    }
  }

  const rowValues = [
    resident.ID || 'NK' + Utilities.formatDate(new Date(), 'GMT', 'yyyyMMddHHmmss'),
    resident.MaNhaTro,
    resident.TenNhaTro,
    resident.TenPhong,
    resident.HoTen,
    resident.NgaySinh,
    resident.GioiTinh,
    resident.QueQuan,
    resident.NgayVaoO,
    resident.TamTru,
    resident.TrangThai,
    resident.NgayChuyenDi || ''
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, 12).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  return { status: 'success', resident: resident, data: getAllDataFromSheets() };
}

function handleMoveOutResident(id, ngayChuyenDi) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.NHAN_KHAU);
  const data = sheet.getDataRange().getValues();
  const dateStr = ngayChuyenDi || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === id) {
      sheet.getRange(i + 1, 11).setValue('Đã chuyển đi');
      sheet.getRange(i + 1, 12).setValue(dateStr);
      return { status: 'success', message: 'Đã chuyển đi thành công', data: getAllDataFromSheets() };
    }
  }
  return { status: 'error', message: 'Không tìm thấy nhân khẩu ID: ' + id };
}

function handleDeleteResident(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.NHAN_KHAU);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === id) {
      sheet.deleteRow(i + 1);
      return { status: 'success', data: getAllDataFromSheets() };
    }
  }
  return { status: 'error', message: 'Không tìm thấy nhân khẩu' };
}

function handleSaveRoom(room) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.PHONG);
  const data = sheet.getDataRange().getValues();

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === room.MaPhong) {
      rowIndex = i + 1;
      break;
    }
  }

  const rowValues = [room.MaPhong, room.MaNhaTro, room.TenNhaTro, room.TenPhong, room.GhiChu || ''];
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, 5).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
  return { status: 'success', room: room, data: getAllDataFromSheets() };
}

function handleDeleteRoom(maPhong) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.PHONG);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === maPhong) {
      sheet.deleteRow(i + 1);
      return { status: 'success', data: getAllDataFromSheets() };
    }
  }
  return { status: 'error', message: 'Không tìm thấy phòng' };
}

function handleSaveAccount(account) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.TAI_KHOAN);
  const data = sheet.getDataRange().getValues();

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === account.Username.toLowerCase()) {
      rowIndex = i + 1;
      break;
    }
  }

  const rowValues = [account.Username, account.Password, account.Role, account.MaNhaTro, account.TenNhaTro];
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, 5).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
  return { status: 'success', account: account, data: getAllDataFromSheets() };
}

function handleDeleteAccount(username) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.TAI_KHOAN);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === String(username).trim().toLowerCase()) {
      sheet.deleteRow(i + 1);
      return { status: 'success', data: getAllDataFromSheets() };
    }
  }
  return { status: 'error', message: 'Không tìm thấy tài khoản' };
}

function handleSyncAll(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  initDatabase();

  if (payload.accounts && payload.accounts.length > 0) {
    const sAcc = ss.getSheetByName(SHEET_NAMES.TAI_KHOAN);
    sAcc.clearContents();
    sAcc.appendRow(['Username', 'Password', 'Role', 'MaNhaTro', 'TenNhaTro']);
    payload.accounts.forEach(function(a) {
      sAcc.appendRow([a.Username, a.Password || '123', a.Role, a.MaNhaTro, a.TenNhaTro]);
    });
  }

  if (payload.rooms && payload.rooms.length > 0) {
    const sRoom = ss.getSheetByName(SHEET_NAMES.PHONG);
    sRoom.clearContents();
    sRoom.appendRow(['MaPhong', 'MaNhaTro', 'TenNhaTro', 'TenPhong', 'GhiChu']);
    payload.rooms.forEach(function(r) {
      sRoom.appendRow([r.MaPhong, r.MaNhaTro, r.TenNhaTro, r.TenPhong, r.GhiChu || '']);
    });
  }

  if (payload.residents && payload.residents.length > 0) {
    const sNK = ss.getSheetByName(SHEET_NAMES.NHAN_KHAU);
    sNK.clearContents();
    sNK.appendRow(['ID', 'MaNhaTro', 'TenNhaTro', 'TenPhong', 'HoTen', 'NgaySinh', 'GioiTinh', 'QueQuan', 'NgayVaoO', 'TamTru', 'TrangThai', 'NgayChuyenDi']);
    payload.residents.forEach(function(nk) {
      sNK.appendRow([nk.ID, nk.MaNhaTro, nk.TenNhaTro, nk.TenPhong, nk.HoTen, nk.NgaySinh, nk.GioiTinh, nk.QueQuan, nk.NgayVaoO, nk.TamTru, nk.TrangThai, nk.NgayChuyenDi || '']);
    });
  }

  return { status: 'success', message: 'Đồng bộ toàn bộ dữ liệu lên Google Sheets thành công!' };
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
