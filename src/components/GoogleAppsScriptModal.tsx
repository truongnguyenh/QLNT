import React, { useState, useEffect } from 'react';
import {
  Code2,
  Copy,
  Check,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Send,
  Globe,
} from 'lucide-react';
import { GOOGLE_APPS_SCRIPT_CODE } from '../utils/googleAppsScriptCode.ts';
import { STANDALONE_INDEX_HTML } from '../utils/standaloneHtml.ts';
import { RentalAppState, RentalService, SyncStatus } from '../services/rentalService.ts';

interface GoogleAppsScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  gasUrl: string;
  onSaveGasUrl: (url: string) => void;
  currentData: RentalAppState;
  onDataLoadedFromSheets: (newData: RentalAppState) => void;
  syncStatus?: SyncStatus;
  lastSyncTime?: string | null;
}

export const GoogleAppsScriptModal: React.FC<GoogleAppsScriptModalProps> = ({
  isOpen,
  onClose,
  gasUrl,
  onSaveGasUrl,
  currentData,
  onDataLoadedFromSheets,
  syncStatus = 'disconnected',
  lastSyncTime = null,
}) => {
  const [urlInput, setUrlInput] = useState(gasUrl);
  const [activeSubTab, setActiveSubTab] = useState<'exportGuide' | 'code' | 'indexHtml'>('exportGuide');
  const [isCopied, setIsCopied] = useState(false);
  const [isHtmlCopied, setIsHtmlCopied] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  useEffect(() => {
    setUrlInput(gasUrl);
  }, [gasUrl, isOpen]);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {}
  };

  const getCustomizedIndexHtml = () => {
    const cleanUrl = urlInput.trim();
    if (!cleanUrl) return STANDALONE_INDEX_HTML;
    return STANDALONE_INDEX_HTML.replace(
      "gasUrl: localStorage.getItem(GAS_URL_KEY) || '',",
      `gasUrl: localStorage.getItem(GAS_URL_KEY) || '${cleanUrl}',`
    );
  };

  const handleCopyIndexHtml = async () => {
    try {
      await navigator.clipboard.writeText(getCustomizedIndexHtml());
      setIsHtmlCopied(true);
      setTimeout(() => setIsHtmlCopied(false), 2500);
    } catch {}
  };

  const handleDownloadCode = () => {
    const blob = new Blob([GOOGLE_APPS_SCRIPT_CODE], {
      type: 'text/javascript;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Code.gs';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadIndexHtml = () => {
    const blob = new Blob([getCustomizedIndexHtml()], {
      type: 'text/html;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'index.html';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveAndEnableRealtime = async () => {
    const clean = urlInput.trim();
    if (!clean) {
      onSaveGasUrl('');
      setStatusMessage({
        type: 'info',
        text: 'Đã ngắt kết nối URL Google Apps Script. Ứng dụng đang lưu cục bộ.',
      });
      return;
    }

    if (!clean.startsWith('http')) {
      setStatusMessage({
        type: 'error',
        text: 'Vui lòng nhập URL hợp lệ (bắt đầu bằng https://script.google.com/macros/s/.../exec)',
      });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);
    onSaveGasUrl(clean);

    const pullResult = await RentalService.pullFromGoogleSheets(clean);
    setIsLoading(false);

    if (pullResult.success && pullResult.data) {
      onDataLoadedFromSheets(pullResult.data);
      setStatusMessage({
        type: 'success',
        text: 'Đã bật đồng bộ thời gian thực 2 chiều! Mọi thay đổi từ nay sẽ tự động cập nhật trực tiếp với Google Sheets.',
      });
    } else {
      setStatusMessage({
        type: 'error',
        text: pullResult.message,
      });
    }
  };

  const handlePullFromSheets = async () => {
    if (!urlInput.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Vui lòng nhập URL Google Apps Script Web App trước.',
      });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);
    onSaveGasUrl(urlInput.trim());

    const result = await RentalService.pullFromGoogleSheets(urlInput.trim());
    setIsLoading(false);

    if (result.success && result.data) {
      onDataLoadedFromSheets(result.data);
      setStatusMessage({
        type: 'success',
        text: 'Đã tải dữ liệu mới nhất từ Google Sheets về hệ thống!',
      });
    } else {
      setStatusMessage({
        type: 'error',
        text: result.message,
      });
    }
  };

  const handlePushToSheets = async () => {
    if (!urlInput.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Vui lòng nhập URL Google Apps Script Web App trước.',
      });
      return;
    }

    if (
      !window.confirm(
        'Bạn có chắc chắn muốn ghi đè toàn bộ dữ liệu hiện tại lên Google Sheets không?'
      )
    ) {
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);
    onSaveGasUrl(urlInput.trim());

    const result = await RentalService.pushToGoogleSheets(urlInput.trim(), currentData);
    setIsLoading(false);

    setStatusMessage({
      type: result.success ? 'success' : 'error',
      text: result.message,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 my-6 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Cấu Hình Quản Trị: Đồng Bộ Google Sheets & Xuất Ứng Dụng
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Chỉ dành cho Quản trị viên (ADMIN) · Đồng bộ tự động 2 chiều theo thời gian thực
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg leading-none p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-slate-200 mt-4 shrink-0 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('exportGuide')}
            className={`py-2.5 px-4 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'exportGuide'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            1. Kết nối thời gian thực & Hướng dẫn
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('code')}
            className={`py-2.5 px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'code'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>2. Mã nguồn Code.gs (Backend)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('indexHtml')}
            className={`py-2.5 px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'indexHtml'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>3. File Index.html (Độc lập)</span>
          </button>
        </div>

        {/* Content area */}
        <div className="mt-4 overflow-y-auto flex-1 pr-1 space-y-5">
          {activeSubTab === 'exportGuide' && (
            <div className="space-y-5 text-xs text-slate-700">
              {/* Real-time Web App URL Sync Box (Moved to top for immediate access) */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <label
                    htmlFor="gasUrlInput"
                    className="block text-xs font-bold text-slate-900"
                  >
                    Đường dẫn Google Apps Script Web App (Đồng bộ tự động 2 chiều):
                  </label>
                  <span className="font-mono text-[11px] text-slate-500">
                    {syncStatus === 'synced'
                      ? `Trạng thái: Đã đồng bộ (${lastSyncTime || 'Tự động'})`
                      : syncStatus === 'syncing'
                      ? 'Trạng thái: Đang đồng bộ...'
                      : syncStatus === 'error'
                      ? 'Trạng thái: Lỗi kết nối'
                      : 'Trạng thái: Chưa kết nối URL'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="gasUrlInput"
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 outline-hidden focus:ring-2 focus:ring-slate-900 bg-white font-mono"
                  />
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleSaveAndEnableRealtime}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap"
                  >
                    {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Lưu & Bật đồng bộ tự động</span>
                  </button>
                </div>

                <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
                  Khi đã lưu đường dẫn trên: mọi thao tác thêm/sửa/xóa phòng, thêm nhân khẩu, chuyển đi, đổi tạm trú sẽ <strong>tự động ghi ngay lập tức lên Google Sheets</strong>, đồng thời ứng dụng tự động tải dữ liệu mới từ Google Sheets mỗi 10 giây.
                </p>

                {statusMessage && (
                  <div
                    className={`mt-3 p-3 rounded-lg text-xs flex items-start gap-2 ${
                      statusMessage.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : statusMessage.type === 'info'
                        ? 'bg-slate-100 text-slate-800 border border-slate-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {statusMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <span>{statusMessage.text}</span>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handlePullFromSheets}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Tải ngay từ Sheet về</span>
                    </button>

                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handlePushToSheets}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Ghi đè toàn bộ lên Sheet</span>
                    </button>
                  </div>

                  {gasUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setUrlInput('');
                        onSaveGasUrl('');
                        setStatusMessage({
                          type: 'info',
                          text: 'Đã ngắt kết nối Google Sheets.',
                        });
                      }}
                      className="text-xs text-red-600 hover:text-red-800 font-medium cursor-pointer"
                    >
                      Ngắt kết nối
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Download Bar */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900 text-sm">
                    Tải nhanh bộ file triển khai
                  </div>
                  <p className="text-slate-500 mt-0.5">
                    Trọn bộ 2 file chuẩn (đã tích hợp đồng bộ thời gian thực) để đưa lên Google Apps Script.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleDownloadCode}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải Code.gs</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadIndexHtml}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold transition cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải Index.html</span>
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 text-sm">
                  Các bước tạo link Google Apps Script (Chỉ làm 1 lần duy nhất):
                </h4>
                <ol className="list-decimal pl-5 space-y-1.5 leading-relaxed">
                  <li>
                    Mở một trang tính Google Sheets mới tại{' '}
                    <a
                      href="https://sheets.new"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline font-medium"
                    >
                      sheets.new
                    </a>
                    .
                  </li>
                  <li>
                    Trên thanh menu, chọn <strong>Tiện ích mở rộng (Extensions)</strong> &rarr;{' '}
                    <strong>Apps Script</strong>.
                  </li>
                  <li>
                    Xóa mã cũ trong <code>Code.gs</code>, sang tab{' '}
                    <strong>"2. Mã nguồn Code.gs"</strong> ở trên, bấm <em>Sao chép Code.gs</em> rồi dán vào và nhấn <strong>Ctrl + S</strong>.
                  </li>
                  <li>
                    Bấm nút <strong>Triển khai (Deploy)</strong> &rarr;{' '}
                    <strong>Tùy chọn triển khai mới (New deployment)</strong> &rarr; chọn loại{' '}
                    <strong>Ứng dụng web (Web app)</strong> &rarr; mục <em>Ai có quyền truy cập</em> chọn{' '}
                    <strong>Bất kỳ ai (Anyone)</strong> &rarr; bấm <strong>Triển khai</strong>.
                  </li>
                  <li>
                    Sao chép đường dẫn Web App (kết thúc bằng <code>/exec</code>) dán vào ô ở trên và bấm <strong>Lưu & Bật đồng bộ tự động</strong>.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {activeSubTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">
                  Mã nguồn backend Google Apps Script (Code.gs):
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition cursor-pointer"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Đã sao chép!' : 'Sao chép Code.gs'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCode}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải file Code.gs</span>
                  </button>
                </div>
              </div>

              <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-96 leading-relaxed">
                {GOOGLE_APPS_SCRIPT_CODE}
              </pre>
            </div>
          )}

          {activeSubTab === 'indexHtml' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">
                  File Index.html hoàn chỉnh (Có sẵn đồng bộ thời gian thực):
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopyIndexHtml}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition cursor-pointer"
                  >
                    {isHtmlCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isHtmlCopied ? 'Đã sao chép!' : 'Sao chép Index.html'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadIndexHtml}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải file Index.html</span>
                  </button>
                </div>
              </div>

              <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-96 leading-relaxed">
                {STANDALONE_INDEX_HTML}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center shrink-0">
          <span className="text-xs text-slate-500">
            Hãy đổi mật khẩu tài khoản Quản trị viên ngay sau khi kết nối Google Sheets chính thức.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition cursor-pointer"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};
