import React, { useState, useEffect } from 'react';
import {
  Building2,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { TaiKhoan } from '../types/rental.ts';
import { authenticateAccount } from '../utils/rentalRules.ts';

interface AuthScreenProps {
  accounts: TaiKhoan[];
  onLoginSuccess: (user: TaiKhoan) => void;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

export const AuthScreen: React.FC<AuthScreenProps> = ({
  accounts,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = window.setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          setFailedAttempts(0);
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockoutRemaining]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutRemaining > 0) return;
    setError(null);

    if (!username.trim() || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    const authenticatedUser = authenticateAccount(accounts, username, password);

    if (authenticatedUser) {
      setFailedAttempts(0);
      setPassword('');
      onLoginSuccess(authenticatedUser);
    } else {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
        setLockoutRemaining(LOCKOUT_SECONDS);
        setError(
          `Bạn đã nhập sai quá ${MAX_FAILED_ATTEMPTS} lần. Tạm khóa đăng nhập trong ${LOCKOUT_SECONDS} giây để bảo vệ an toàn.`
        );
      } else {
        setError(
          `Tên đăng nhập hoặc mật khẩu không chính xác (Còn ${
            MAX_FAILED_ATTEMPTS - nextAttempts
          } lần thử).`
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Left Architectural Brand Column (Desktop) */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-slate-900 text-white p-12 xl:p-16 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-white">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Hệ Thống Quản Lý Nhà Trọ
            </span>
          </div>

          <div className="mt-16 max-w-lg">
            <h1 className="text-3xl xl:text-4xl font-bold tracking-tight leading-tight text-balance">
              Quản lý phòng trọ, nhân khẩu và hồ sơ tạm trú tập trung.
            </h1>
            <p className="mt-4 text-slate-300 text-base leading-relaxed">
              Giải pháp vận hành nhà trọ bảo mật, phân quyền độc lập giữa Quản trị viên hệ thống và từng Chủ nhà trọ.
            </p>
          </div>

          <div className="mt-12 pt-10 border-t border-slate-800 grid grid-cols-2 gap-8">
            <div>
              <div className="text-2xl font-bold font-mono tabular-nums text-white">
                Tối đa 4 người
              </div>
              <p className="mt-1 text-sm text-slate-400">
                Kiểm soát định mức cư trú tự động cho từng phòng trọ
              </p>
            </div>
            <div>
              <div className="text-2xl font-bold font-mono tabular-nums text-white">
                Phân quyền riêng
              </div>
              <p className="mt-1 text-sm text-slate-400">
                Bảo mật dữ liệu độc lập theo từng mã nhà trọ được cấp phát
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-8 border-t border-slate-800/80">
          <span>Hệ thống Quản lý Lưu trú & Nhân khẩu</span>
          <span>Bảo mật & Phân quyền</span>
        </div>
      </div>

      {/* Right Login Form Column */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile Brand Header */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-base font-bold text-slate-900 tracking-tight">
              Hệ Thống Quản Lý Nhà Trọ
            </span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Đăng nhập hệ thống
            </h2>
            <p className="mt-1.5 text-sm text-slate-600">
              Nhập tài khoản quản trị hoặc tài khoản nhà trọ đã được cấp phát.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-6 p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>
                {lockoutRemaining > 0
                  ? `Tạm khóa đăng nhập để bảo vệ an toàn. Vui lòng thử lại sau ${lockoutRemaining} giây.`
                  : error}
              </span>
            </div>
          )}

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold text-slate-800 mb-1.5"
              >
                Tên đăng nhập
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  disabled={lockoutRemaining > 0}
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập"
                  className="block w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-hidden transition disabled:bg-slate-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-800 mb-1.5"
              >
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={lockoutRemaining > 0}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="block w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-hidden transition disabled:bg-slate-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={lockoutRemaining > 0}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.99] transition cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>
                  {lockoutRemaining > 0
                    ? `Thử lại sau ${lockoutRemaining}s`
                    : 'Đăng nhập'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200 flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-slate-600 shrink-0" />
            <span>
              Phiên làm việc được bảo vệ theo phân quyền nhà trọ. Liên hệ Quản trị viên nếu quên mật khẩu.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
