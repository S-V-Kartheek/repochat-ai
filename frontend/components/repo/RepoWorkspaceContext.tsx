"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { useAuth } from "@clerk/nextjs";
import { createApiClient } from "@/lib/api";
import type { Citation, RepoSymbol } from "@/lib/types";
import {
  initialRepoExplorerState,
  repoExplorerReducer,
  type RepoExplorerState,
} from "@/lib/repoExplorer";

const XL_BREAKPOINT = 1280;

function shouldAutoOpenSheet(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < XL_BREAKPOINT;
}

interface RepoWorkspaceContextValue {
  explorer: RepoExplorerState;
  openCitation: (citation: Citation) => void;
  selectFilePath: (path: string) => void;
  selectSymbol: (symbol: RepoSymbol) => void;
  setActiveTab: (tab: RepoExplorerState["activeTab"]) => void;
  setContextSheetOpen: (open: boolean) => void;
  clearCodeView: () => void;
}

const RepoWorkspaceContext = createContext<RepoWorkspaceContextValue | null>(null);

export function RepoWorkspaceProvider({
  children,
  repoId,
}: {
  children: ReactNode;
  repoId: string;
}) {
  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const [explorer, dispatch] = useReducer(
    repoExplorerReducer,
    undefined,
    initialRepoExplorerState
  );

  useEffect(() => {
    let cancelled = false;

    const loadTree = async () => {
      dispatch({
        type: "SET_TREE_STATE",
        loadState: "loading",
        tree: [],
        error: null,
      });

      try {
        const response = await api.repos.getTree(repoId);
        if (cancelled) return;
        dispatch({
          type: "SET_TREE_STATE",
          loadState: response.tree.length > 0 ? "ready" : "empty",
          tree: response.tree,
          error: null,
        });
      } catch (error: unknown) {
        if (cancelled) return;
        dispatch({
          type: "SET_TREE_STATE",
          loadState: "error",
          tree: [],
          error: error instanceof Error ? error.message : "Failed to load files",
        });
      }
    };

    void loadTree();
    return () => {
      cancelled = true;
    };
  }, [api.repos, repoId]);

  useEffect(() => {
    let cancelled = false;

    const loadSymbols = async () => {
      dispatch({
        type: "SET_SYMBOLS_STATE",
        loadState: "loading",
        symbols: [],
        error: null,
      });

      try {
        const symbols = await api.repos.getSymbols(repoId);
        if (cancelled) return;
        dispatch({
          type: "SET_SYMBOLS_STATE",
          loadState: symbols.length > 0 ? "ready" : "empty",
          symbols,
          error: null,
        });
      } catch (error: unknown) {
        if (cancelled) return;
        dispatch({
          type: "SET_SYMBOLS_STATE",
          loadState: "error",
          symbols: [],
          error: error instanceof Error ? error.message : "Failed to load symbols",
        });
      }
    };

    void loadSymbols();
    return () => {
      cancelled = true;
    };
  }, [api.repos, repoId]);

  useEffect(() => {
    if (!explorer.selectedFilePath || explorer.codeDisplayMode === "none") {
      dispatch({
        type: "SET_FILE_STATE",
        loadState: explorer.codeDisplayMode === "none" ? "idle" : "empty",
        fileContent: null,
        error: null,
      });
      return;
    }

    let cancelled = false;

    const loadFile = async () => {
      dispatch({
        type: "SET_FILE_STATE",
        loadState: "loading",
        fileContent: null,
        error: null,
      });

      try {
        const file = await api.repos.getFile(repoId, explorer.selectedFilePath!);
        if (cancelled) return;
        dispatch({
          type: "SET_FILE_STATE",
          loadState: "ready",
          fileContent: file,
          error: null,
        });
      } catch (error: unknown) {
        if (cancelled) return;
        dispatch({
          type: "SET_FILE_STATE",
          loadState: "error",
          fileContent: null,
          error: error instanceof Error ? error.message : "Failed to load file",
        });
      }
    };

    void loadFile();
    return () => {
      cancelled = true;
    };
  }, [api.repos, repoId, explorer.selectedFilePath, explorer.codeDisplayMode]);

  const openCitation = useCallback((citation: Citation) => {
    dispatch({ type: "OPEN_CITATION", citation });
    if (shouldAutoOpenSheet()) {
      dispatch({ type: "SET_SHEET_OPEN", open: true });
    }
  }, []);

  const selectFilePath = useCallback((path: string) => {
    dispatch({ type: "SELECT_FILE", path });
    if (shouldAutoOpenSheet()) {
      dispatch({ type: "SET_SHEET_OPEN", open: true });
    }
  }, []);

  const selectSymbol = useCallback((symbol: RepoSymbol) => {
    dispatch({ type: "SELECT_SYMBOL", symbol });
    if (shouldAutoOpenSheet()) {
      dispatch({ type: "SET_SHEET_OPEN", open: true });
    }
  }, []);

  const setActiveTab = useCallback((tab: RepoExplorerState["activeTab"]) => {
    dispatch({ type: "SET_TAB", tab });
  }, []);

  const setContextSheetOpen = useCallback((open: boolean) => {
    dispatch({ type: "SET_SHEET_OPEN", open });
  }, []);

  const clearCodeView = useCallback(() => {
    dispatch({ type: "CLEAR_CODE_VIEW" });
  }, []);

  const value = useMemo(
    () => ({
      explorer,
      openCitation,
      selectFilePath,
      selectSymbol,
      setActiveTab,
      setContextSheetOpen,
      clearCodeView,
    }),
    [
      explorer,
      openCitation,
      selectFilePath,
      selectSymbol,
      setActiveTab,
      setContextSheetOpen,
      clearCodeView,
    ]
  );

  return (
    <RepoWorkspaceContext.Provider value={value}>
      {children}
    </RepoWorkspaceContext.Provider>
  );
}

export function useRepoWorkspace(): RepoWorkspaceContextValue {
  const ctx = useContext(RepoWorkspaceContext);
  if (!ctx) {
    throw new Error("useRepoWorkspace must be used within RepoWorkspaceProvider");
  }
  return ctx;
}
