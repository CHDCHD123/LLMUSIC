import { ReactNode, useEffect } from "react";

type AppModalProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  onClose: () => void;
  children?: ReactNode;
};

export default function AppModal({
  open,
  title,
  description,
  confirmLabel = "확인",
  onClose,
  children,
}: AppModalProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="모달 닫기"
        className="absolute inset-0 bg-[rgba(8,9,12,0.72)] backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative w-full max-w-[520px] overflow-hidden rounded-[28px] border border-[#e9c176]/20 bg-[#111319]/95 shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e9c176]/60 to-transparent" />
        <div className="absolute -left-16 top-0 h-44 w-44 rounded-full bg-[#e9c176]/10 blur-3xl" />
        <div className="absolute -bottom-16 right-0 h-40 w-40 rounded-full bg-[#a67c2b]/10 blur-3xl" />

        <div className="relative space-y-6 px-7 py-7 md:px-8 md:py-8">
          <div className="space-y-3">
            <div
              className="text-[11px] uppercase tracking-[0.22em] text-[#e9c176]"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Notice
            </div>
            <h2
              className="text-[32px] leading-[1.15] text-white"
              style={{ fontFamily: '"Noto Serif", serif' }}
            >
              {title}
            </h2>
            {description ? (
              <p
                className="text-[15px] leading-7 text-white/70"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                {description}
              </p>
            ) : null}
          </div>

          {children ? <div>{children}</div> : null}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#e9c176]/35 bg-[#e9c176]/12 px-6 py-3 text-[12px] uppercase tracking-[0.2em] text-[#f2d9a0] transition-all hover:bg-[#e9c176]/18"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
