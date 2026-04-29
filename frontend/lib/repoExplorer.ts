/**
 * Repo workspace explorer state for file tree, symbols, and code viewer.
 */

import type { Citation, RepoFileContent, RepoFileNode, RepoSymbol } from "@/lib/types";

export type ResourceLoadState = "idle" | "loading" | "ready" | "empty" | "error";
export type ExplorerTab = "files" | "symbols" | "code";
export type CodeDisplayMode = "none" | "file";

export interface RepoExplorerState {
  treeLoadState: ResourceLoadState;
  tree: RepoFileNode[];
  treeError: string | null;
  symbolsLoadState: ResourceLoadState;
  symbols: RepoSymbol[];
  symbolsError: string | null;
  fileLoadState: ResourceLoadState;
  fileContent: RepoFileContent | null;
  fileError: string | null;
  selectedFilePath: string | null;
  highlightedRange: { startLine: number; endLine: number } | null;
  codeDisplayMode: CodeDisplayMode;
  citationSnippet: string | null;
  activeTab: ExplorerTab;
  contextSheetOpen: boolean;
}

export const initialRepoExplorerState = (): RepoExplorerState => ({
  treeLoadState: "idle",
  tree: [],
  treeError: null,
  symbolsLoadState: "idle",
  symbols: [],
  symbolsError: null,
  fileLoadState: "idle",
  fileContent: null,
  fileError: null,
  selectedFilePath: null,
  highlightedRange: null,
  codeDisplayMode: "none",
  citationSnippet: null,
  activeTab: "files",
  contextSheetOpen: false,
});

export type RepoExplorerAction =
  | { type: "OPEN_CITATION"; citation: Citation }
  | { type: "SELECT_FILE"; path: string }
  | { type: "SELECT_SYMBOL"; symbol: RepoSymbol }
  | { type: "SET_TAB"; tab: ExplorerTab }
  | { type: "SET_SHEET_OPEN"; open: boolean }
  | { type: "SET_TREE_STATE"; loadState: ResourceLoadState; tree?: RepoFileNode[]; error?: string | null }
  | { type: "SET_SYMBOLS_STATE"; loadState: ResourceLoadState; symbols?: RepoSymbol[]; error?: string | null }
  | { type: "SET_FILE_STATE"; loadState: ResourceLoadState; fileContent?: RepoFileContent | null; error?: string | null }
  | { type: "CLEAR_CODE_VIEW" };

export function repoExplorerReducer(
  state: RepoExplorerState,
  action: RepoExplorerAction
): RepoExplorerState {
  switch (action.type) {
    case "OPEN_CITATION": {
      const { citation } = action;
      return {
        ...state,
        selectedFilePath: citation.file,
        highlightedRange: {
          startLine: citation.startLine,
          endLine: citation.endLine,
        },
        codeDisplayMode: "file",
        citationSnippet: citation.snippet,
        activeTab: "code",
      };
    }
    case "SELECT_FILE":
      return {
        ...state,
        selectedFilePath: action.path,
        highlightedRange: null,
        codeDisplayMode: "file",
        citationSnippet: null,
        activeTab: "code",
      };
    case "SELECT_SYMBOL":
      return {
        ...state,
        selectedFilePath: action.symbol.filePath,
        highlightedRange: {
          startLine: action.symbol.line,
          endLine: action.symbol.endLine,
        },
        codeDisplayMode: "file",
        citationSnippet: null,
        activeTab: "code",
      };
    case "SET_TAB":
      return { ...state, activeTab: action.tab };
    case "SET_SHEET_OPEN":
      return { ...state, contextSheetOpen: action.open };
    case "SET_TREE_STATE":
      return {
        ...state,
        treeLoadState: action.loadState,
        tree: action.tree ?? state.tree,
        treeError: action.error === undefined ? state.treeError : action.error,
      };
    case "SET_SYMBOLS_STATE":
      return {
        ...state,
        symbolsLoadState: action.loadState,
        symbols: action.symbols ?? state.symbols,
        symbolsError: action.error === undefined ? state.symbolsError : action.error,
      };
    case "SET_FILE_STATE":
      return {
        ...state,
        fileLoadState: action.loadState,
        fileContent: action.fileContent === undefined ? state.fileContent : action.fileContent,
        fileError: action.error === undefined ? state.fileError : action.error,
      };
    case "CLEAR_CODE_VIEW":
      return {
        ...state,
        fileLoadState: "idle",
        fileContent: null,
        fileError: null,
        codeDisplayMode: "none",
        citationSnippet: null,
        highlightedRange: null,
      };
  }
}
