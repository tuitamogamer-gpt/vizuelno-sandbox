"use client";
import { useI18n } from "@/components/language-provider";

import { useEffect, useRef, useId } from "react";
import { X } from "lucide-react";
export default function Dialog({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const { t } = useI18n();

  const titleId=useId();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = ref.current; el?.showModal(); return () => el?.close(); }, []);
  return <dialog ref={ref} className={`modal ${wide ? "wide" : ""}`} aria-labelledby={titleId} onCancel={onClose} onClick={e => { if (e.target === ref.current) { const r = ref.current.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); } }}><div className="modal-top"><h2 id={titleId}>{t(title)}</h2><button className="icon-button" onClick={onClose} aria-label={t("Zatvori prozor")}><X size={20} /></button></div>{children}</dialog>;
}
