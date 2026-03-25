"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, User } from "lucide-react";

interface AvatarUploadProps {
  file: File | null;
  preview: string | null;
  onFileChange: (file: File | null, preview: string | null) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function AvatarUpload({ file, preview, onFileChange, disabled }: AvatarUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSet = useCallback(
    (f: File) => {
      setError("");
      if (!ACCEPTED_TYPES.includes(f.type)) {
        setError("Please upload a PNG, JPEG, or WebP image.");
        return;
      }
      if (f.size > MAX_SIZE) {
        setError("Photo must be under 10MB.");
        return;
      }
      onFileChange(f, URL.createObjectURL(f));
    },
    [onFileChange]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const f = e.dataTransfer.files[0];
    if (f) validateAndSet(f);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) validateAndSet(f);
    // Reset so the same file can be re-selected
    e.target.value = "";
  }

  function handleRemove() {
    setError("");
    onFileChange(null, null);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {/* Avatar preview circle */}
        <div
          className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 transition-colors ${
            dragOver
              ? "border-solid border-purple-400 bg-purple-950/50"
              : "border-dashed border-purple-500/30 bg-purple-950/30"
          }`}
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
          onDragEnter={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        >
          <AnimatePresence mode="wait">
            {preview ? (
              <motion.img
                key="preview"
                src={preview}
                alt="Avatar preview"
                className="h-full w-full object-cover"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              />
            ) : (
              <motion.div
                key="placeholder"
                className="flex h-full w-full items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {dragOver ? (
                  <Upload className="h-5 w-5 text-purple-400 animate-bounce" />
                ) : (
                  <User className="h-5 w-5 text-purple-500/50" />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Upload label / file info */}
        <div className="flex-1 space-y-1">
          <label
            className={`group flex cursor-pointer items-center gap-2 rounded-lg border border-purple-500/20 bg-purple-950/20 px-3 py-2.5 text-xs text-purple-300 transition-all hover:border-purple-500/40 hover:bg-purple-950/30 ${
              disabled ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            {file ? file.name : "Upload your photo"}
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileInput}
              disabled={disabled}
            />
          </label>
          {file ? (
            <button
              onClick={handleRemove}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-red-400 transition-colors"
            >
              <X className="h-2.5 w-2.5" />
              Remove photo &middot; use default avatar
            </button>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              Drop a photo or click to upload &middot; default avatar for instant demo
            </p>
          )}
        </div>
      </div>

      {/* Validation error */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-[11px] text-red-400 pl-1"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
