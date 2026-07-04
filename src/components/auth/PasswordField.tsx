"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordFieldProps = {
  className: string;
};

export function PasswordField({ className }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative mt-2">
      <input
        aria-label="密码"
        autoComplete="current-password"
        className={`${className} pr-12`}
        id="password"
        name="password"
        placeholder="请输入密码"
        required
        type={visible ? "text" : "password"}
      />
      <button
        aria-label={visible ? "隐藏密码" : "显示密码"}
        className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-[#8fa5a5] transition hover:bg-white/40 hover:text-[#1a7373] focus:outline-none"
        onClick={() => setVisible((value) => !value)}
        type="button"
      >
        {visible ? (
          <EyeOff className="size-[17px]" aria-hidden />
        ) : (
          <Eye className="size-[17px]" aria-hidden />
        )}
      </button>
    </div>
  );
}
