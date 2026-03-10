"use client";

import React from "react";

interface EditorBrowserFrameProps {
  title: string;
  children: React.ReactNode;
}

export function EditorBrowserFrame({ title, children }: EditorBrowserFrameProps) {
  return (
    <div className="flex flex-col h-full border-2 border-[#4A3326] rounded-lg overflow-hidden shadow-[4px_4px_0_#4A3326]">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#4A3326]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 flex justify-center">
          <span className="text-[10px] font-['Press_Start_2P'] text-[#FFF8F0]/60 truncate max-w-[60%]">
            {title}
          </span>
        </div>
        <div className="w-[52px]" /> {/* Spacer to balance dots */}
      </div>
      {/* Content area */}
      <div className="bg-[#FFF8F0] flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
