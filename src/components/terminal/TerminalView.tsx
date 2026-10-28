import React, { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { SearchAddon } from "@xterm/addon-search";
import "@xterm/xterm/css/xterm.css";
import { TERMINAL_THEMES } from "../../styles/terminalThemes";
import { TerminalTab } from "../../types/session";
import { VirtualShellSession } from "../../services/virtualShell";
import { ZoomIn, ZoomOut, RotateCcw, Copy, Search, X, ChevronUp, ChevronDown } from "lucide-react";

interface TerminalViewProps {
  tab: TerminalTab;
  activeThemeId?: string;
  fontSize?: number;
  multiExecActive?: boolean;
  onBroadcastInput?: (data: string) => void;
  broadcastData?: { timestamp: number; data: string; senderTabId: string } | null;
  onDirectoryChange?: (newPath: string) => void;
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  tab,
  activeThemeId = "omni-dark",
  fontSize: initialFontSize = 14,
  multiExecActive = false,
  onBroadcastInput,
  broadcastData,
  onDirectoryChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const shellRef = useRef<VirtualShellSession | null>(null);

  const [fontSize, setFontSize] = useState<number>(initialFontSize);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Keep a ref to handle multi-exec recursion
  const isBroadcastingRef = useRef<boolean>(false);

  // Initialize or get VirtualShellSession
  if (!shellRef.current) {
    const host = tab.hostInfo || "omniterm-bastion";
    const user = tab.protocol === "local" ? "operator" : "root";
    shellRef.current = new VirtualShellSession(host, user);
  }

  // Handle incoming broadcast from multi-exec
  useEffect(() => {
    if (!broadcastData || !termRef.current || broadcastData.senderTabId === tab.id) return;
    // Deliver broadcast keystrokes to this terminal
    handleDataInput(broadcastData.data, false);
  }, [broadcastData]);

  const handleDataInput = useCallback((data: string, shouldBroadcast = true) => {
    const term = termRef.current;
    const shell = shellRef.current;
    if (!term || !shell) return;

    if (shouldBroadcast && multiExecActive && onBroadcastInput && !isBroadcastingRef.current) {
      isBroadcastingRef.current = true;
      onBroadcastInput(data);
      isBroadcastingRef.current = false;
    }
  }, [multiExecActive, onBroadcastInput]);

  useEffect(() => {
    if (!containerRef.current) return;

    const theme = TERMINAL_THEMES[activeThemeId]?.theme || TERMINAL_THEMES["omni-dark"].theme;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: "bar",
      fontSize,
      fontFamily: "Cascadia Code, Fira Code, JetBrains Mono, Consolas, monospace",
      theme,
      allowTransparency: true,
      scrollback: 10000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(searchAddon);

    term.open(containerRef.current);

    // Try loading WebGL GPU addon if supported
    try {
      const webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => {
        webglAddon.dispose();
      });
      term.loadAddon(webglAddon);
    } catch {
      // Fallback to default canvas
    }

    termRef.current = term;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;

    fitAddon.fit();

    // Welcome banner
    term.writeln("\x1b[1;34m╔══════════════════════════════════════════════════════════════╗\x1b[0m");
    term.writeln("\x1b[1;34m║\x1b[0m  \x1b[1;36mOmniTerm Pro V0.1\x1b[0m - Cross-Platform Bastion & Shell   \x1b[1;34m║\x1b[0m");
    term.writeln(
      `\x1b[1;34m║\x1b[0m  \x1b[90mProfile:\x1b[0m \x1b[1;33m${(tab.title || "Local Shell").padEnd(20, " ")}\x1b[0m (\x1b[1;32m${tab.protocol.toUpperCase()}\x1b[0m)            \x1b[1;34m║\x1b[0m`
    );
    term.writeln(
      `\x1b[1;34m║\x1b[0m  \x1b[90mTarget:\x1b[0m  \x1b[36m${(tab.hostInfo || "localhost").padEnd(46, " ")}\x1b[0m \x1b[1;34m║\x1b[0m`
    );
    term.writeln("\x1b[1;34m╚══════════════════════════════════════════════════════════════╝\x1b[0m\r\n");

    term.writeln(
      `\x1b[90mConnected to ${tab.hostInfo || "omniterm"} via simulated PTY session. Type \x1b[1;37mhelp\x1b[0m\x1b[90m for commands.\x1b[0m\r\n`
    );

    const shell = shellRef.current!;
    term.write(shell.getPrompt());

    let currentInput = "";
    let cursorPosition = 0;

    const redrawInput = (newInput: string, newPos: number) => {
      // Clear line from prompt onwards
      term.write("\r\x1b[K");
      term.write(shell.getPrompt());
      term.write(newInput);
      currentInput = newInput;
      cursorPosition = newPos;
      // Move cursor to pos if needed
      const diff = newInput.length - newPos;
      if (diff > 0) {
        term.write(`\x1b[${diff}D`);
      }
    };

    const disposable = term.onData((data) => {
      if (multiExecActive && onBroadcastInput && !isBroadcastingRef.current) {
        isBroadcastingRef.current = true;
        onBroadcastInput(data);
        isBroadcastingRef.current = false;
      }

      // Enter key
      if (data === "\r") {
        term.write("\r\n");
        const cmd = currentInput;
        currentInput = "";
        cursorPosition = 0;

        const res = shell.execute(cmd);
        if (res.clear) {
          term.clear();
        } else if (res.output) {
          term.write(res.output);
        }

        if (res.exit) {
          term.writeln("\x1b[90mConnection closed. Press Enter to restart shell.\x1b[0m");
          return;
        }

        onDirectoryChange?.(shell.getCurrentDir());
        term.write(shell.getPrompt());
      }
      // Backspace
      else if (data === "\u007F") {
        if (cursorPosition > 0) {
          const updated =
            currentInput.slice(0, cursorPosition - 1) + currentInput.slice(cursorPosition);
          redrawInput(updated, cursorPosition - 1);
        }
      }
      // Ctrl+C (Interrupt)
      else if (data === "\u0003") {
        term.write("^C\r\n");
        currentInput = "";
        cursorPosition = 0;
        term.write(shell.getPrompt());
      }
      // Ctrl+L (Clear screen)
      else if (data === "\u000C") {
        term.clear();
        term.write(shell.getPrompt() + currentInput);
      }
      // Tab (Autocomplete)
      else if (data === "\t") {
        const words = currentInput.slice(0, cursorPosition).split(" ");
        const currentWord = words[words.length - 1];
        if (currentWord) {
          const completions = shell.getCompletions(currentWord);
          if (completions.length === 1) {
            const completion = completions[0];
            const remaining = completion.slice(currentWord.length);
            const updated =
              currentInput.slice(0, cursorPosition) +
              remaining +
              (completion.endsWith("/") ? "" : " ") +
              currentInput.slice(cursorPosition);
            redrawInput(updated, cursorPosition + remaining.length + (completion.endsWith("/") ? 0 : 1));
          } else if (completions.length > 1) {
            term.write("\r\n" + completions.join("  ") + "\r\n");
            term.write(shell.getPrompt() + currentInput);
          }
        }
      }
      // Arrow Up (History previous)
      else if (data === "\x1b[A") {
        const prevCmd = shell.getHistory("up");
        redrawInput(prevCmd, prevCmd.length);
      }
      // Arrow Down (History next)
      else if (data === "\x1b[B") {
        const nextCmd = shell.getHistory("down");
        redrawInput(nextCmd, nextCmd.length);
      }
      // Arrow Left
      else if (data === "\x1b[D") {
        if (cursorPosition > 0) {
          cursorPosition--;
          term.write("\x1b[D");
        }
      }
      // Arrow Right
      else if (data === "\x1b[C") {
        if (cursorPosition < currentInput.length) {
          cursorPosition++;
          term.write("\x1b[C");
        }
      }
      // Printable characters
      else if (data >= " " && !data.startsWith("\x1b")) {
        const updated =
          currentInput.slice(0, cursorPosition) + data + currentInput.slice(cursorPosition);
        currentInput = updated;
        cursorPosition += data.length;
        if (cursorPosition === updated.length) {
          term.write(data);
        } else {
          redrawInput(updated, cursorPosition);
        }
      }
    });

    // Resize observer for container
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch {
        // Ignored
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      disposable.dispose();
      term.dispose();
    };
  }, [tab.id, activeThemeId]);

  // Adjust font size dynamically
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.fontSize = fontSize;
      fitAddonRef.current?.fit();
    }
  }, [fontSize]);

  const handleCopySelection = () => {
    if (termRef.current) {
      const selection = termRef.current.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 1500);
      }
    }
  };

  const handleClear = () => {
    termRef.current?.clear();
    const shell = shellRef.current;
    if (shell && termRef.current) {
      termRef.current.write(shell.getPrompt());
    }
  };

  const handleSearchNext = () => {
    if (searchAddonRef.current && searchQuery) {
      searchAddonRef.current.findNext(searchQuery);
    }
  };

  const handleSearchPrev = () => {
    if (searchAddonRef.current && searchQuery) {
      searchAddonRef.current.findPrevious(searchQuery);
    }
  };

  return (
    <div className="relative flex flex-col h-full w-full bg-[#0c0e14] overflow-hidden">
      {/* Floating terminal toolbar */}
      <div className="absolute top-2 right-4 z-10 flex items-center space-x-1 bg-[#181b26]/90 backdrop-blur-md px-2 py-1 rounded-md border border-[#282d3f] shadow-lg opacity-40 hover:opacity-100 transition-opacity">
        <button
          onClick={() => setShowSearch((s) => !s)}
          className={`p-1 rounded transition-colors ${
            showSearch ? "bg-primary text-white" : "text-slate-400 hover:text-slate-100 hover:bg-[#282d3f]"
          }`}
          title="Search Terminal (Ctrl+F)"
        >
          <Search className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setFontSize((s) => Math.min(s + 1, 28))}
          className="p-1 text-slate-400 hover:text-slate-100 hover:bg-[#282d3f] rounded"
          title="Zoom In (Ctrl +)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setFontSize((s) => Math.max(s - 1, 9))}
          className="p-1 text-slate-400 hover:text-slate-100 hover:bg-[#282d3f] rounded"
          title="Zoom Out (Ctrl -)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleClear}
          className="p-1 text-slate-400 hover:text-slate-100 hover:bg-[#282d3f] rounded"
          title="Clear Terminal"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleCopySelection}
          className="p-1 text-slate-400 hover:text-slate-100 hover:bg-[#282d3f] rounded"
          title={isCopied ? "Copied!" : "Copy Selection"}
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating search bar */}
      {showSearch && (
        <div className="absolute top-10 right-4 z-20 flex items-center space-x-1.5 bg-[#181b26] border border-[#282d3f] px-2.5 py-1.5 rounded-lg shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
          <input
            type="text"
            placeholder="Search buffer..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              searchAddonRef.current?.findNext(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (e.shiftKey) handleSearchPrev();
                else handleSearchNext();
              } else if (e.key === "Escape") {
                setShowSearch(false);
              }
            }}
            className="bg-[#0f1117] text-xs text-slate-100 px-2 py-1 rounded border border-[#282d3f] focus:outline-none focus:border-primary w-44 font-mono"
            autoFocus
          />
          <button
            onClick={handleSearchPrev}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-[#282d3f]"
            title="Previous (Shift+Enter)"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleSearchNext}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-[#282d3f]"
            title="Next (Enter)"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowSearch(false)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-[#282d3f]"
            title="Close Search (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Terminal mount target */}
      <div ref={containerRef} className="flex-1 h-full w-full p-2 overflow-hidden" />
    </div>
  );
};
