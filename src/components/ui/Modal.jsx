import React from "react";
import { X } from "lucide-react";

export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-gray-900/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="text-xs text-gray-500 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

export const inputClass = "w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-200";
