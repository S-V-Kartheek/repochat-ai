"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { PanelRight, X } from "lucide-react";
import { useRepoWorkspace } from "./RepoWorkspaceContext";
import RepoExplorerPanelBody from "./RepoExplorerPanelBody";

/**
 * Floating entry + bottom sheet for repo context on viewports below `xl`.
 */
export default function RepoContextMobile() {
  const { explorer, setContextSheetOpen } = useRepoWorkspace();

  return (
    <>
      {!explorer.contextSheetOpen && (
      <button
        type="button"
        className="xl:hidden fixed z-40 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg transition-transform active:scale-[0.98]"
        style={{
          right: "max(16px, env(safe-area-inset-right))",
          bottom: "max(96px, calc(80px + env(safe-area-inset-bottom)))",
          background: "linear-gradient(180deg,#2f6ff1 0%,#2457ca 100%)",
          color: "#fff",
          boxShadow: "var(--glow-accent), var(--shadow)",
        }}
        onClick={() => setContextSheetOpen(true)}
        aria-label="Open repository context"
      >
        <PanelRight size={18} />
        Context
      </button>
      )}

      <Dialog.Root
        open={explorer.contextSheetOpen}
        onOpenChange={setContextSheetOpen}
      >
        <Dialog.Portal>
          <Dialog.Overlay
            className="xl:hidden fixed inset-0 z-50"
            style={{ background: "rgba(15,23,42,0.4)", backdropFilter: "blur(3px)" }}
          />
          <Dialog.Content
            className="xl:hidden fixed z-50 left-2 right-2 bottom-2 max-h-[88vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl outline-none fade-in"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <Dialog.Description className="sr-only">
              File tree, symbol list, and code viewer for this repository.
            </Dialog.Description>
            <div
              className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
            >
              <Dialog.Title className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                Repository context
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  aria-label="Close repository context"
                >
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden p-3 flex flex-col">
              <RepoExplorerPanelBody className="flex-1" minHeight="min-h-[320px]" />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
