import React from "react";

/** The line of the spoken guide currently being said, in both languages, with a Skip button. */
export default function GuideCard({ line, onSkip }) {
  if (!line) return null;
  return (
    <div className="absolute bottom-3 left-3 right-3 max-h-[45%] overflow-y-auto bg-black/80 text-white text-xs px-3 py-2.5 rounded-xl">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wide text-violet-300">Guide · {line.index + 1}/{line.total}</span>
        <button onClick={onSkip} className="text-[11px] underline text-gray-200">Skip · छोड़ें</button>
      </div>
      <span className="block leading-snug">{line.message.en}</span>
      <span className="block text-gray-300 leading-snug mt-0.5" lang="hi">{line.message.hi}</span>
    </div>
  );
}
