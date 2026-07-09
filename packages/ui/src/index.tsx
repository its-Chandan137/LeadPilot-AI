import { type ButtonHTMLAttributes, type PropsWithChildren } from "react";
import clsx from "clsx";

export function Button({
  className,
  children,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
