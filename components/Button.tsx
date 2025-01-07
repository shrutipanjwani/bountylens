import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

export default function Button({
  children,
  variant = "primary",
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        px-4 py-2 rounded-lg font-medium transition-all
        ${
          variant === "primary"
            ? "bg-gray-900 text-white hover:bg-black"
            : "bg-gray-900 text-gray-100 hover:bg-black"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
