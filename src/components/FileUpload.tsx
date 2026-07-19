import {
  type DragEvent,
  type FC,
  useCallback,
  useRef,
  useState,
} from "react";
import type { QAItemPayload } from "../types/api.ts";

// ---------------------------------------------------------------------------
// FileUpload – drag & drop JSONL upload with live preview
// ---------------------------------------------------------------------------

interface Props {
  onParsed: (items: QAItemPayload[], fileName: string) => void;
  disabled?: boolean;
  accept?: string;
}

export const FileUpload: FC<Props> = ({
  onParsed,
  disabled = false,
  accept = ".jsonl,.json",
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [itemCount, setItemCount] = useState<number | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ------------------------------------------------------------------
  // Parse a File object
  // ------------------------------------------------------------------
  const parseFile = useCallback(
    async (file: File) => {
      setIsParsing(true);
      setParseError(null);
      setFileName(file.name);

      try {
        const text = await file.text();
        const lines = text
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        if (lines.length === 0) {
          setParseError("文件为空");
          setItemCount(null);
          return;
        }

        const items: QAItemPayload[] = [];
        for (let i = 0; i < lines.length; i++) {
          try {
            const obj = JSON.parse(lines[i]);
            if (!obj.question || !obj.answer) {
              throw new Error(
                `第 ${i + 1} 行缺少 question 或 answer 字段`,
              );
            }
            items.push(obj as QAItemPayload);
          } catch (e) {
            throw new Error(
              `第 ${i + 1} 行 JSON 解析失败: ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        }

        setItemCount(items.length);
        onParsed(items, file.name);
      } catch (err) {
        setParseError(
          err instanceof Error ? err.message : "文件解析失败",
        );
        setItemCount(null);
      } finally {
        setIsParsing(false);
      }
    },
    [onParsed],
  );

  // ------------------------------------------------------------------
  // Event handlers
  // ------------------------------------------------------------------
  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      if (!disabled) setDragOver(true);
    },
    [disabled],
  );
  const handleDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      if (!disabled) setDragOver(true);
    },
    [disabled],
  );
  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);
  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) parseFile(file);
    },
    [disabled, parseFile],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) parseFile(file);
    },
    [parseFile],
  );

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleReset = useCallback(() => {
    setFileName(null);
    setItemCount(null);
    setParseError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="space-y-3">
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed
          px-8 py-10 text-center transition-all duration-200
          ${dragOver
            ? "border-primary bg-primary/5"
            : "border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500"
          }
          ${disabled ? "pointer-events-none opacity-50" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />

        {isParsing ? (
          <div className="space-y-2">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-zinc-500">解析文件中...</p>
          </div>
        ) : fileName ? (
          <div className="space-y-1">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <svg className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            {itemCount !== null && !parseError && (
              <p className="font-medium text-zinc-700 dark:text-zinc-300">
                {fileName} · {itemCount} 条数据
              </p>
            )}
            {parseError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {parseError}
              </p>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              className="text-xs text-zinc-400 underline hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              重新选择
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <svg
              className="mx-auto h-10 w-10 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              拖放 JSONL 文件到此处，或点击选择
            </p>
            <p className="text-xs text-zinc-400">
              每行一个 JSON 对象，需包含 question 和 answer 字段
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
