"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { Braces, FolderTree, Loader2, AlertTriangle, Code2 } from "lucide-react";
import { useRepoWorkspace } from "./RepoWorkspaceContext";
import MockFileTree from "./MockFileTree";
import CodeViewerPane from "./CodeViewerPane";

const tabListClass = "flex flex-shrink-0 gap-0.5 p-1 rounded-lg mb-2";
const tabTriggerClass =
  "flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-2 rounded-md transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-1";
const tabTriggerInactive = "text-[var(--text-muted)] hover:bg-[var(--surface-3)]";
const tabTriggerActive =
  "text-[var(--accent)] bg-white shadow-sm border border-[var(--border)]";

export default function RepoExplorerPanelBody({
  className = "",
  minHeight = "min-h-0",
}: {
  className?: string;
  minHeight?: string;
}) {
  const { explorer, selectFilePath, selectSymbol, setActiveTab } = useRepoWorkspace();

  const onTabChange = (value: string) => {
    if (value === "files" || value === "symbols" || value === "code") {
      setActiveTab(value as "files" | "symbols" | "code");
    }
  };

  return (
    <div className={`flex flex-col ${minHeight} ${className}`}>
      <Tabs.Root
        value={explorer.activeTab}
        onValueChange={onTabChange}
        className="flex flex-col flex-1 min-h-0"
      >
        <Tabs.List
          className={tabListClass}
          style={{ background: "var(--surface-3)" }}
          aria-label="Repository context"
        >
          <Tabs.Trigger
            value="files"
            className={`${tabTriggerClass} ${
              explorer.activeTab === "files" ? tabTriggerActive : tabTriggerInactive
            }`}
            style={
              explorer.activeTab === "files" ? { boxShadow: "var(--shadow-sm)" } : undefined
            }
          >
            <FolderTree size={14} />
            Files
          </Tabs.Trigger>
          <Tabs.Trigger
            value="symbols"
            className={`${tabTriggerClass} ${
              explorer.activeTab === "symbols" ? tabTriggerActive : tabTriggerInactive
            }`}
          >
            <Braces size={14} />
            Symbols
          </Tabs.Trigger>
          <Tabs.Trigger
            value="code"
            className={`${tabTriggerClass} ${
              explorer.activeTab === "code" ? tabTriggerActive : tabTriggerInactive
            }`}
          >
            <Code2 size={14} />
            Code
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="files" className="flex-1 min-h-0 overflow-y-auto outline-none">
          {explorer.treeLoadState === "loading" && (
            <div
              className="flex flex-col items-center justify-center py-14 px-4"
              style={{ color: "var(--text-muted)" }}
            >
              <Loader2 size={22} className="animate-spin mb-3" />
              <p className="text-sm">Loading files...</p>
            </div>
          )}
          {explorer.treeLoadState === "error" && explorer.treeError && (
            <div
              className="flex flex-col items-center text-center py-10 px-4 rounded-lg"
              style={{
                background: "var(--error-muted)",
                border: "1px solid rgba(220,38,38,0.2)",
              }}
            >
              <AlertTriangle size={20} className="mb-2" style={{ color: "var(--error)" }} />
              <p className="text-sm font-medium mb-1" style={{ color: "var(--error)" }}>
                Could not load file tree
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {explorer.treeError}
              </p>
            </div>
          )}
          {explorer.treeLoadState === "empty" && (
            <div className="py-10 px-4 text-center">
              <FolderTree
                size={22}
                className="mx-auto mb-3"
                style={{ color: "var(--text-faint)" }}
              />
              <p className="text-sm font-medium mb-1" style={{ color: "var(--text)" }}>
                No files available
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                This repository does not currently expose a browsable file tree.
              </p>
            </div>
          )}
          {explorer.treeLoadState === "ready" && (
            <MockFileTree
              roots={explorer.tree}
              selectedPath={explorer.selectedFilePath}
              onSelectPath={selectFilePath}
            />
          )}
          {explorer.treeLoadState === "idle" && (
            <div className="py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              Preparing file tree...
            </div>
          )}
        </Tabs.Content>

        <Tabs.Content value="symbols" className="flex-1 min-h-0 overflow-y-auto outline-none">
          {explorer.symbolsLoadState === "loading" && (
            <div
              className="flex flex-col items-center justify-center py-14 px-4"
              style={{ color: "var(--text-muted)" }}
            >
              <Loader2 size={22} className="animate-spin mb-3" />
              <p className="text-sm">Loading symbols...</p>
            </div>
          )}
          {explorer.symbolsLoadState === "error" && explorer.symbolsError && (
            <div
              className="flex flex-col items-center text-center py-10 px-4 rounded-lg"
              style={{
                background: "var(--error-muted)",
                border: "1px solid rgba(220,38,38,0.2)",
              }}
            >
              <AlertTriangle size={20} className="mb-2" style={{ color: "var(--error)" }} />
              <p className="text-sm font-medium mb-1" style={{ color: "var(--error)" }}>
                Could not load symbols
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {explorer.symbolsError}
              </p>
            </div>
          )}
          {explorer.symbolsLoadState === "empty" && (
            <div className="py-10 px-4 text-center">
              <Braces size={22} className="mx-auto mb-3" style={{ color: "var(--text-faint)" }} />
              <p className="text-sm font-medium mb-1" style={{ color: "var(--text)" }}>
                No symbols returned
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                The repository is indexed, but no symbols were returned for the current files.
              </p>
            </div>
          )}
          {explorer.symbolsLoadState === "ready" && explorer.symbols.length > 0 && (
            <ul className="space-y-1">
              {explorer.symbols.map((symbol) => (
                <li key={`${symbol.filePath}:${symbol.line}:${symbol.name}`}>
                  <button
                    type="button"
                    onClick={() => selectSymbol(symbol)}
                    className="w-full text-left rounded-lg px-3 py-2 transition-colors"
                    style={{
                      border: "1px solid var(--border)",
                      background: "var(--surface-2)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{symbol.name}</span>
                      <span
                        className="text-[10px] uppercase tracking-wide flex-shrink-0 px-1.5 py-0.5 rounded"
                        style={{
                          background: "var(--surface-3)",
                          color: "var(--text-faint)",
                        }}
                      >
                        {symbol.kind}
                      </span>
                    </div>
                    <p
                      className="text-[11px] font-mono truncate mt-0.5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {symbol.filePath}:{symbol.line}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {explorer.symbolsLoadState === "idle" && (
            <div className="py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              Preparing symbol list...
            </div>
          )}
        </Tabs.Content>

        <Tabs.Content
          value="code"
          className="flex-1 min-h-0 flex flex-col outline-none border rounded-lg overflow-hidden"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <CodeViewerPane explorer={explorer} fileLabel={explorer.selectedFilePath} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
