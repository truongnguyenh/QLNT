/**
 * Complete, production-ready single-file Index.html (Bootstrap 5 + JavaScript)
 * Features automatic real-time bidirectional synchronization with Google Sheets:
 * - Works inside Google Apps Script via google.script.run
 * - Works standalone in any browser via Google Apps Script Web App URL (fetch)
 */

export const STANDALONE_INDEX_HTML = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hệ Thống Quản Lý Nhà Trọ</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    :root {
      --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }
    body {
      font-family: var(--font-sans);
      background-color: #f8fafc;
      color: #0f172a;
      margin: 0;
    }
    .mono-num { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
    .login-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background-color: #f8fafc;
    }
    .login-card {
      width: 100%;
      max-width: 420px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 36px 32px;
      box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);
    }
    .top-bar {
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      padding: 12px 24px;
      position: sticky;
      top: 0;
      z-index: 40;
    }
    .surface-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
    }
    .slot-box {
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 8px;
      text-align: center;
      font-size: 12px;
      background: #f8fafc;
    }
    .slot-box.occupied {
      border: 1px solid #bfdbfe;
      background: #eff6ff;
      color: #1e3a8a;
      font-weight: 600;
    }
    .nav-tab-btn {
      border: none;
      background: transparent;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      border-radius: 8px;
      transition: all 0.15s;
    }
    .nav-tab-btn:hover { color: #0f172a; background: #f1f5f9; }
    .nav-tab-btn.active { color: #0f172a; background: #e2e8f0; }
  </style>
</head>
<body>
  <div id="app"></div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    const MAX_PER_ROOM = 4;
    const STORAGE_KEY = 'QLNT_STANDALONE_DATA_V1';
    const GAS_URL_KEY = 'QUAN_LY_NHA_TRO_GAS_URL';

    let isMutating = false;
    let state = {
      currentUser: null,
      activeTab: 'rooms',
      adminFilter: 'ALL',
      syncStatus: 'Chưa kết nối',
      lastSyncTime: '',
      gasUrl: localStorage.getItem(GAS_URL_KEY) || '',
      accounts: [
        { Username: 'admin', Password: 'admin123', Role: 'ADMIN', MaNhaTro: 'ALL', TenNhaTro: 'Tất cả nhà trọ' },
        { Username: 'chutro1', Password: '123456', Role: 'USER', MaNhaTro: 'NT01', TenNhaTro: 'Nhà trọ Bình An' },
        { Username: 'chutro2', Password: '123456', Role: 'USER', MaNhaTro: 'NT02', TenNhaTro: 'Nhà trọ Hưng Thịnh' }
      ],
      rooms: [
        { MaPhong: 'NT01-P101', MaNhaTro: 'NT01', TenNhaTro: 'Nhà trọ Bình An', TenPhong: 'Phòng 101', GhiChu: 'Tầng 1 - Mặt tiền' },
        { MaPhong: 'NT01-P102', MaNhaTro: 'NT01', TenNhaTro: 'Nhà trọ Bình An', TenPhong: 'Phòng 102', GhiChu: 'Tầng 1 - Gác lửng' },
        { MaPhong: 'NT02-P1', MaNhaTro: 'NT02', TenNhaTro: 'Nhà trọ Hưng Thịnh', TenPhong: 'Phòng 01', GhiChu: 'Dãy A' }
      ],
      residents: [
        { ID: 'NK001', MaNhaTro: 'NT01', TenNhaTro: 'Nhà trọ Bình An', TenPhong: 'Phòng 101', HoTen: 'Nguyễn Văn An', NgaySinh: '1998-05-12', GioiTinh: 'Nam', QueQuan: 'Hà Nam', NgayVaoO: '2023-08-01', TamTru: 'Đã khai báo', TrangThai: 'Đang ở', NgayChuyenDi: '' },
        { ID: 'NK002', MaNhaTro: 'NT01', TenNhaTro: 'Nhà trọ Bình An', TenPhong: 'Phòng 101', HoTen: 'Trần Văn Bình', NgaySinh: '1999-11-20', GioiTinh: 'Nam', QueQuan: 'Thái Bình', NgayVaoO: '2023-08-01', TamTru: 'Đã khai báo', TrangThai: 'Đang ở', NgayChuyenDi: '' },
        { ID: 'NK003', MaNhaTro: 'NT01', TenNhaTro: 'Nhà trọ Bình An', TenPhong: 'Phòng 101', HoTen: 'Lê Minh Cường', NgaySinh: '2000-02-14', GioiTinh: 'Nam', QueQuan: 'Nam Định', NgayVaoO: '2023-09-15', TamTru: 'Chưa khai báo', TrangThai: 'Đang ở', NgayChuyenDi: '' },
        { ID: 'NK004', MaNhaTro: 'NT01', TenNhaTro: 'Nhà trọ Bình An', TenPhong: 'Phòng 101', HoTen: 'Phạm Hoàng Dũng', NgaySinh: '2001-07-08', GioiTinh: 'Nam', QueQuan: 'Thanh Hóa', NgayVaoO: '2023-10-01', TamTru: 'Đã khai báo', TrangThai: 'Đang ở', NgayChuyenDi: '' }
      ]
    };

    function isInsideGas() {
      return typeof google !== 'undefined' && google.script && google.script.run;
    }

    function updateSyncLabel(statusText) {
      state.syncStatus = statusText;
      state.lastSyncTime = new Date().toLocaleTimeString('vi-VN');
      const el = document.getElementById('syncBadgeText');
      if (el) {
        el.textContent = state.syncStatus + (state.lastSyncTime ? ' (' + state.lastSyncTime + ')' : '');
      }
    }

    async function pullFromCloud() {
      if (isMutating) return;
      if (isInsideGas()) {
        updateSyncLabel('Đang đồng bộ...');
        google.script.run.withSuccessHandler(function(res) {
          if (res && res.accounts && !isMutating) {
            state.accounts = res.accounts;
            state.rooms = res.rooms || [];
            state.residents = res.residents || [];
            saveLocal();
            updateSyncLabel('Đã đồng bộ thực tế');
            render();
          }
        }).clientGetAllData();
      } else if (state.gasUrl && state.gasUrl.startsWith('http')) {
        try {
          updateSyncLabel('Đang đồng bộ...');
          const sep = state.gasUrl.includes('?') ? '&' : '?';
          const res = await fetch(state.gasUrl + sep + 'action=getAllData&t=' + Date.now(), {
            method: 'GET',
            redirect: 'follow'
          });
          const json = await res.json();
          if (json.status === 'success' && json.data && !isMutating) {
            state.accounts = json.data.accounts || state.accounts;
            state.rooms = json.data.rooms || [];
            state.residents = json.data.residents || [];
            saveLocal();
            updateSyncLabel('Đã đồng bộ thực tế');
            render();
          }
        } catch (err) {
          updateSyncLabel('Lỗi kết nối Sheet');
        }
      }
    }

    async function pushMutationToCloud(actionName, payloadObj, gasMethodName, ...gasArgs) {
      saveLocal();
      if (isInsideGas()) {
        isMutating = true;
        updateSyncLabel('Đang lưu lên Sheet...');
        google.script.run.withSuccessHandler(function(res) {
          isMutating = false;
          if (res && res.data) {
            state.accounts = res.data.accounts || state.accounts;
            state.rooms = res.data.rooms || state.rooms;
            state.residents = res.data.residents || state.residents;
            saveLocal();
          }
          updateSyncLabel('Đã đồng bộ thực tế');
          render();
        }).withFailureHandler(function() {
          isMutating = false;
          updateSyncLabel('Lỗi lưu Sheet');
        })[gasMethodName](...gasArgs);
      } else if (state.gasUrl && state.gasUrl.startsWith('http')) {
        isMutating = true;
        updateSyncLabel('Đang lưu lên Sheet...');
        try {
          const res = await fetch(state.gasUrl, {
            method: 'POST',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(Object.assign({ action: actionName }, payloadObj))
          });
          const json = await res.json();
          if (json.status === 'success' && json.data) {
            state.accounts = json.data.accounts || state.accounts;
            state.rooms = json.data.rooms || state.rooms;
            state.residents = json.data.residents || state.residents;
            saveLocal();
          }
          updateSyncLabel('Đã đồng bộ thực tế');
        } catch (e) {
          updateSyncLabel('Lỗi lưu Sheet');
        } finally {
          isMutating = false;
          render();
        }
      }
    }

    function loadData() {
      try {
        const local = localStorage.getItem(STORAGE_KEY);
        if (local) {
          const parsed = JSON.parse(local);
          state.accounts = parsed.accounts || state.accounts;
          state.rooms = parsed.rooms || state.rooms;
          state.residents = parsed.residents || state.residents;
        }
      } catch (e) {}

      render();
      pullFromCloud();

      // Tự động đồng bộ thời gian thực mỗi 10 giây và khi quay lại tab
      setInterval(() => {
        if (document.visibilityState === 'visible') {
          pullFromCloud();
        }
      }, 10000);

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          pullFromCloud();
        }
      });
    }

    function saveLocal() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          accounts: state.accounts,
          rooms: state.rooms,
          residents: state.residents
        }));
      } catch (e) {}
    }

    function configureGasUrl() {
      const nextUrl = prompt('Nhập đường dẫn Web App Google Apps Script (https://script.google.com/macros/s/.../exec):', state.gasUrl);
      if (nextUrl !== null) {
        state.gasUrl = nextUrl.trim();
        localStorage.setItem(GAS_URL_KEY, state.gasUrl);
        if (state.gasUrl) {
          pullFromCloud();
        } else {
          updateSyncLabel('Chưa kết nối');
          render();
        }
      }
    }

    function getActiveOccupants(maNhaTro, tenPhong) {
      return state.residents.filter(r =>
        r.MaNhaTro === maNhaTro &&
        r.TenPhong.trim().toLowerCase() === tenPhong.trim().toLowerCase() &&
        r.TrangThai === 'Đang ở'
      );
    }

    function extractRoomNum(text) {
      if (!text) return null;
      const m = String(text).match(/\\d+/g);
      return m && m.length > 0 ? parseInt(m[m.length - 1], 10) : null;
    }

    function compareRoomNames(a, b) {
      const nA = extractRoomNum(a);
      const nB = extractRoomNum(b);
      if (nA !== null && nB !== null && nA !== nB) return nA - nB;
      return String(a || '').localeCompare(String(b || ''), 'vi', { numeric: true, sensitivity: 'base' });
    }

    function getFilteredRooms() {
      if (!state.currentUser) return [];
      const list = state.currentUser.Role === 'ADMIN'
        ? (state.adminFilter === 'ALL' ? state.rooms : state.rooms.filter(r => r.MaNhaTro === state.adminFilter))
        : state.rooms.filter(r => r.MaNhaTro === state.currentUser.MaNhaTro);
      return [...list].sort((a, b) => {
        const h = String(a.MaNhaTro || '').localeCompare(String(b.MaNhaTro || ''), 'vi', { numeric: true });
        if (h !== 0) return h;
        return compareRoomNames(a.TenPhong, b.TenPhong);
      });
    }

    function getFilteredResidents() {
      if (!state.currentUser) return [];
      const list = state.currentUser.Role === 'ADMIN'
        ? (state.adminFilter === 'ALL' ? state.residents : state.residents.filter(r => r.MaNhaTro === state.adminFilter))
        : state.residents.filter(r => r.MaNhaTro === state.currentUser.MaNhaTro);
      return [...list].sort((a, b) => {
        const h = String(a.MaNhaTro || '').localeCompare(String(b.MaNhaTro || ''), 'vi', { numeric: true });
        if (h !== 0) return h;
        return compareRoomNames(a.TenPhong, b.TenPhong);
      });
    }

    function render() {
      const root = document.getElementById('app');
      if (!state.currentUser) {
        root.innerHTML = \`
          <div class="login-wrapper">
            <div class="login-card">
              <div class="mb-4">
                <h4 class="fw-bold mb-1">Hệ Thống Quản Lý Nhà Trọ</h4>
                <p class="text-secondary small mb-0">Đăng nhập bằng tài khoản được cấp để quản lý dữ liệu</p>
              </div>
              <div id="loginError" class="alert alert-danger py-2 small d-none"></div>
              <form onsubmit="handleLogin(event)">
                <div class="mb-3">
                  <label class="form-label small fw-semibold">Tên đăng nhập</label>
                  <input type="text" id="inpUser" class="form-control" required placeholder="Nhập tên đăng nhập">
                </div>
                <div class="mb-4">
                  <label class="form-label small fw-semibold">Mật khẩu</label>
                  <input type="password" id="inpPass" class="form-control" required placeholder="Nhập mật khẩu">
                </div>
                <button type="submit" class="btn btn-dark w-100 py-2 fw-semibold">Đăng nhập</button>
              </form>
              <div class="mt-4 pt-3 border-top small text-secondary">
                <span>Phiên làm việc được bảo mật theo phân quyền nhà trọ.</span>
              </div>
            </div>
          </div>
        \`;
        return;
      }

      const rooms = getFilteredRooms();
      const residents = getFilteredResidents();
      const activeResidents = residents.filter(r => r.TrangThai === 'Đang ở');
      const movedResidents = residents.filter(r => r.TrangThai === 'Đã chuyển đi');

      root.innerHTML = \`
        <header class="top-bar d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div class="d-flex align-items-center gap-4">
            <span class="fw-bold fs-6">Quản Lý Nhà Trọ</span>
            <nav class="d-flex gap-1">
              <button class="nav-tab-btn \${state.activeTab === 'rooms' ? 'active' : ''}" onclick="setTab('rooms')">Phòng trọ (\${rooms.length})</button>
              <button class="nav-tab-btn \${state.activeTab === 'residents' ? 'active' : ''}" onclick="setTab('residents')">Nhân khẩu đang ở (\${activeResidents.length})</button>
              <button class="nav-tab-btn \${state.activeTab === 'history' ? 'active' : ''}" onclick="setTab('history')">Lịch sử chuyển đi (\${movedResidents.length})</button>
              \${state.currentUser.Role === 'ADMIN' ? \`<button class="nav-tab-btn \${state.activeTab === 'accounts' ? 'active' : ''}" onclick="setTab('accounts')">Tài khoản</button>\` : ''}
            </nav>
          </div>
          <div class="d-flex align-items-center gap-3">
            \${state.currentUser.Role === 'ADMIN' && !isInsideGas()
              ? \`<span id="syncBadgeText" class="small text-emerald-700 fw-medium" style="cursor:pointer" onclick="configureGasUrl()">\${state.syncStatus}\${state.lastSyncTime ? ' (' + state.lastSyncTime + ')' : ''}</span>\`
              : \`<span id="syncBadgeText" class="small text-secondary">\${state.syncStatus}\${state.lastSyncTime ? ' (' + state.lastSyncTime + ')' : ''}</span>\`}
            <span class="small text-secondary">\${state.currentUser.Username} · \${state.currentUser.TenNhaTro}</span>
            <button class="btn btn-outline-secondary btn-sm" onclick="logout()">Đăng xuất</button>
          </div>
        </header>
        <main class="container py-4">
          \${renderTabContent(rooms, activeResidents, movedResidents)}
        </main>
      \`;
    }

    function renderTabContent(rooms, activeResidents, movedResidents) {
      if (state.activeTab === 'rooms') {
        return \`
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h5 class="fw-bold mb-1">Danh sách phòng trọ</h5>
              <p class="text-secondary small mb-0">Giới hạn tối đa 4 người đang ở mỗi phòng · Tự động đồng bộ Google Sheets</p>
            </div>
            <button class="btn btn-dark btn-sm px-3" onclick="promptAddRoom()">+ Thêm phòng mới</button>
          </div>
          <div class="row g-3">
            \${rooms.map(room => {
              const occ = getActiveOccupants(room.MaNhaTro, room.TenPhong);
              const isFull = occ.length >= MAX_PER_ROOM;
              return \`
                <div class="col-md-4">
                  <div class="surface-card h-100 d-flex flex-column justify-content-between">
                    <div>
                      <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <div class="fw-bold">\${room.TenPhong}</div>
                          <div class="text-secondary small">\${room.TenNhaTro} · <span class="mono-num">\${room.MaPhong}</span></div>
                        </div>
                        <span class="mono-num small fw-bold \${isFull ? 'text-danger' : 'text-success'}">\${occ.length}/4 người</span>
                      </div>
                      <div class="row g-2 my-2">
                        \${[0,1,2,3].map(idx => {
                          const p = occ[idx];
                          return \`<div class="col-6"><div class="slot-box \${p ? 'occupied' : ''}">\${p ? p.HoTen : 'Trống'}</div></div>\`;
                        }).join('')}
                      </div>
                    </div>
                    <div class="mt-3 pt-3 border-top d-flex justify-content-between align-items-center">
                      <span class="small text-secondary">\${room.GhiChu || ''}</span>
                      <button class="btn btn-sm \${isFull ? 'btn-secondary disabled' : 'btn-dark'}" \${isFull ? 'disabled' : ''} onclick="promptAddResident('\${room.MaNhaTro}', '\${room.TenPhong}')">
                        \${isFull ? 'Đã đủ 4 người' : '+ Thêm người'}
                      </button>
                    </div>
                  </div>
                </div>
              \`;
            }).join('')}
          </div>
        \`;
      }
      if (state.activeTab === 'residents') {
        return \`
          <div class="surface-card">
            <h5 class="fw-bold mb-3">Danh sách nhân khẩu đang ở (\${activeResidents.length})</h5>
            <div class="table-responsive">
              <table class="table table-hover align-middle small mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Mã ID</th><th>Họ tên</th><th>Giới tính / Ngày sinh</th><th>Quê quán</th><th>Phòng</th><th>Tạm trú</th><th class="text-end">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  \${activeResidents.map(r => \`
                    <tr>
                      <td class="mono-num">\${r.ID}</td>
                      <td class="fw-semibold">\${r.HoTen}</td>
                      <td>\${r.GioiTinh} · <span class="mono-num">\${r.NgaySinh}</span></td>
                      <td>\${r.QueQuan}</td>
                      <td>\${r.TenPhong} · \${r.TenNhaTro}</td>
                      <td>\${r.TamTru}</td>
                      <td class="text-end">
                        <button class="btn btn-outline-danger btn-sm" onclick="handleMoveOut('\${r.ID}')">Chuyển đi</button>
                      </td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
            </div>
          </div>
        \`;
      }
      if (state.activeTab === 'history') {
        return \`
          <div class="surface-card">
            <h5 class="fw-bold mb-3">Lịch sử chuyển đi (\${movedResidents.length})</h5>
            <div class="table-responsive">
              <table class="table align-middle small mb-0">
                <thead class="table-light">
                  <tr><th>Mã ID</th><th>Họ tên</th><th>Phòng cũ</th><th>Ngày vào ở</th><th>Ngày chuyển đi</th></tr>
                </thead>
                <tbody>
                  \${movedResidents.map(r => \`
                    <tr>
                      <td class="mono-num">\${r.ID}</td>
                      <td class="fw-semibold">\${r.HoTen}</td>
                      <td>\${r.TenPhong} (\${r.TenNhaTro})</td>
                      <td class="mono-num">\${r.NgayVaoO}</td>
                      <td class="mono-num text-danger fw-semibold">\${r.NgayChuyenDi}</td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
            </div>
          </div>
        \`;
      }
      return \`
        <div class="surface-card">
          <h5 class="fw-bold mb-3">Tài khoản nhà trọ (\${state.accounts.length})</h5>
          <div class="table-responsive">
            <table class="table align-middle small mb-0">
              <thead class="table-light">
                <tr><th>Username</th><th>Vai trò</th><th>Mã nhà trọ</th><th>Tên nhà trọ</th></tr>
              </thead>
              <tbody>
                \${state.accounts.map(a => \`
                  <tr>
                    <td class="fw-bold">\${a.Username}</td>
                    <td>\${a.Role}</td>
                    <td class="mono-num">\${a.MaNhaTro}</td>
                    <td>\${a.TenNhaTro}</td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      \`;
    }

    function handleLogin(e) {
      e.preventDefault();
      const u = document.getElementById('inpUser').value.trim();
      const p = document.getElementById('inpPass').value;
      const found = state.accounts.find(a => a.Username.toLowerCase() === u.toLowerCase() && Boolean(a.Password) && String(a.Password) === p);
      if (found) {
        state.currentUser = Object.assign({}, found, { Password: '' });
        render();
      } else {
        const err = document.getElementById('loginError');
        err.textContent = 'Tên đăng nhập hoặc mật khẩu không đúng.';
        err.classList.remove('d-none');
      }
    }

    function logout() { state.currentUser = null; render(); }
    function setTab(t) { state.activeTab = t; render(); }

    function promptAddResident(maNhaTro, tenPhong) {
      const occ = getActiveOccupants(maNhaTro, tenPhong);
      if (occ.length >= MAX_PER_ROOM) {
        alert('Phòng đã đủ tối đa 4 người đang ở!');
        return;
      }
      const hoTen = prompt('Nhập họ và tên người thuê mới cho ' + tenPhong + ':');
      if (!hoTen || !hoTen.trim()) return;
      const queQuan = prompt('Nhập quê quán:', '') || 'Chưa cập nhật';
      const roomObj = state.rooms.find(r => r.MaNhaTro === maNhaTro && r.TenPhong === tenPhong);
      const newRes = {
        ID: 'NK' + String(Date.now()).slice(-6),
        MaNhaTro: maNhaTro,
        TenNhaTro: roomObj ? roomObj.TenNhaTro : maNhaTro,
        TenPhong: tenPhong,
        HoTen: hoTen.trim(),
        NgaySinh: '2000-01-01',
        GioiTinh: 'Nam',
        QueQuan: queQuan.trim(),
        NgayVaoO: new Date().toISOString().split('T')[0],
        TamTru: 'Chưa khai báo',
        TrangThai: 'Đang ở',
        NgayChuyenDi: ''
      };
      state.residents.push(newRes);
      render();
      pushMutationToCloud('saveResident', { resident: newRes }, 'clientSaveResident', newRes);
    }

    function handleMoveOut(id) {
      const today = new Date().toISOString().split('T')[0];
      const dateStr = prompt('Nhập ngày chuyển đi (YYYY-MM-DD):', today);
      if (!dateStr) return;
      const target = state.residents.find(r => r.ID === id);
      if (target) {
        target.TrangThai = 'Đã chuyển đi';
        target.NgayChuyenDi = dateStr;
        render();
        pushMutationToCloud('moveOutResident', { id: id, ngayChuyenDi: dateStr }, 'clientMoveOutResident', id, dateStr);
      }
    }

    function promptAddRoom() {
      const rawTenPhong = prompt('Nhập tên hoặc số phòng mới (VD: Phòng 103 hoặc 103):');
      if (!rawTenPhong || !rawTenPhong.trim()) return;
      const trimmed = rawTenPhong.trim();
      const tenPhong = /^\\d+$/.test(trimmed) ? ('Phòng ' + trimmed) : trimmed;
      const numMatch = tenPhong.match(/\\d+/g);
      const codeSuffix = numMatch && numMatch.length > 0 ? ('P' + numMatch[numMatch.length - 1]) : ('P' + (state.rooms.length + 1));
      const maNT = state.currentUser.Role === 'ADMIN' ? 'NT01' : state.currentUser.MaNhaTro;
      const tenNT = state.currentUser.Role === 'ADMIN' ? 'Nhà trọ Bình An' : state.currentUser.TenNhaTro;
      const newRoom = {
        MaPhong: maNT + '-' + codeSuffix,
        MaNhaTro: maNT,
        TenNhaTro: tenNT,
        TenPhong: tenPhong,
        GhiChu: ''
      };
      state.rooms.push(newRoom);
      render();
      pushMutationToCloud('saveRoom', { room: newRoom }, 'clientSaveRoom', newRoom);
    }

    window.onload = loadData;
  </script>
</body>
</html>
`;
