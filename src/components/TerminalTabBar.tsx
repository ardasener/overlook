import type { CSSProperties, KeyboardEvent, MouseEvent, WheelEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Button, Input, Popover, Tag, Tooltip } from "antd";
import {
  ColumnWidthOutlined,
  InsertRowBelowOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  RocketOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useSettings } from "../settings/SettingsContext";
import { useTerminalLayout } from "../layout/TerminalLayoutContext";
import { registerShortcutAction } from "../shortcuts/actionRegistry";
import { isMacOS } from "../lib/platform";
import "./TerminalTabBar.css";

interface TerminalTabBarProps {
  onOpenSettings: () => void;
  workspacesOpen: boolean;
  onToggleWorkspaces: () => void;
}

/**
 * Tab strip (control-only — content is rendered by the split layout) plus the
 * new-tab, split-toggle, settings and workspace-toggle actions. The container
 * is a macOS drag region: AntD tab items (role="tab") and buttons are
 * clickable and block dragging; empty bar space drags the window.
 */
function TerminalTabBar({
  onOpenSettings,
  workspacesOpen,
  onToggleWorkspaces,
}: TerminalTabBarProps) {
  const { state, slotOf, newTab, closeTab, selectTab, toggleVertical, toggleBottom, beginDrag, launchRunnable } =
    useTerminalLayout();
  const { settings, palette } = useSettings();

  const focusedTabId =
    state.focusedSlot < state.slots.length ? state.slots[state.focusedSlot] : null;

  // Runnable launcher popover state.
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [launcherQuery, setLauncherQuery] = useState("");
  const [launcherIndex, setLauncherIndex] = useState(0);

  // Expose opening the launcher to the keyboard hook.
  useEffect(() => {
    return registerShortcutAction("openLauncher", () => setLauncherOpen(true));
  }, []);

  const launch = (commands: string[]) => {
    setLauncherOpen(false);
    setLauncherQuery("");
    setLauncherIndex(0);
    launchRunnable(commands);
  };

  const filteredRunnables = settings.runnables.filter((r) =>
    r.name.toLowerCase().includes(launcherQuery.trim().toLowerCase()),
  );

  // Keep the highlighted index in range when the query changes.
  useEffect(() => {
    setLauncherIndex((i) => Math.min(i, Math.max(0, filteredRunnables.length - 1)));
  }, [filteredRunnables.length]);

  const handleLauncherKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (filteredRunnables.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setLauncherIndex((i) => (i + 1) % filteredRunnables.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setLauncherIndex((i) => (i - 1 + filteredRunnables.length) % filteredRunnables.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      launch(filteredRunnables[launcherIndex].commands);
    }
  };

  // Press origin for pointer-drag initiation (mousedown → threshold → beginDrag).
  const pressRef = useRef<{ tabId: string; x: number; y: number } | null>(null);

  const handleLabelMouseDown = (tabId: string) => (e: MouseEvent) => {
    if (e.button !== 0) return;
    pressRef.current = { tabId, x: e.clientX, y: e.clientY };
  };

  const handleLabelMouseMove = (tabId: string) => (e: MouseEvent) => {
    const press = pressRef.current;
    if (!press || press.tabId !== tabId) return;
    const dx = e.clientX - press.x;
    const dy = e.clientY - press.y;
    if (dx * dx + dy * dy > 16) {
      // ~4px movement threshold: this is a drag, not a click.
      pressRef.current = null;
      beginDrag(tabId, e.clientX, e.clientY);
    }
  };

  const clearPress = () => {
    pressRef.current = null;
  };

  // Strip ref for wheel scrolling + auto-scroll-to-active.
  const stripRef = useRef<HTMLDivElement | null>(null);
  const activeTagRef = useRef<HTMLSpanElement | null>(null);

  // Wheel scrolls the strip horizontally only when content overflows.
  const handleStripWheel = (e: WheelEvent) => {
    const strip = stripRef.current;
    if (!strip || strip.scrollWidth <= strip.clientWidth) return;
    strip.scrollLeft += e.deltaY + e.deltaX;
  };

  // Bring the focused tag into view when the focused tab changes.
  useEffect(() => {
    activeTagRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [focusedTabId]);

  return (
    <div
      className="terminal-tabbar"
      data-tauri-drag-region="deep"
      style={isMacOS() ? ({ paddingLeft: 80 } as CSSProperties) : undefined}
    >
      <div
        ref={stripRef}
        className="tab-strip"
        onWheel={handleStripWheel}
        data-tauri-drag-region="deep"
      >
        {state.tabs.map((tab) => {
          const slot = slotOf(tab.id);
          const focused = tab.id === focusedTabId;
          const accent = slot !== null ? palette.accents[slot] : undefined;
          const tagStyle: CSSProperties = {
            color: accent ?? "var(--ol-text-muted)",
            fontWeight: focused ? 600 : 400,
          };
          if (focused) {
            tagStyle.borderColor = accent;
            tagStyle.background = accent ? `${accent}1a` : undefined;
          }
          return (
            <Tag
              key={tab.id}
              ref={focused ? activeTagRef : undefined}
              closable
              className="terminal-tab-tag"
              style={tagStyle}
              onClick={() => selectTab(tab.id)}
              onClose={(e) => {
                e.preventDefault();
                closeTab(tab.id);
              }}
              onMouseDown={handleLabelMouseDown(tab.id)}
              onMouseMove={handleLabelMouseMove(tab.id)}
              onMouseUp={clearPress}
              onMouseLeave={clearPress}
            >
              {tab.title}
            </Tag>
          );
        })}
      </div>
      <div className="tabbar-actions">
        <Tooltip title={workspacesOpen ? "Hide workspaces" : "Show workspaces"}>
          <Button
            type="text"
            size="small"
            icon={workspacesOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
            onClick={onToggleWorkspaces}
            aria-label="Toggle workspaces"
          />
        </Tooltip>
        <Tooltip title="Settings">
          <Button
            type="text"
            size="small"
            icon={<SettingOutlined />}
            onClick={onOpenSettings}
            aria-label="Settings"
          />
        </Tooltip>
        <Tooltip title="New terminal">
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            onClick={newTab}
            aria-label="New terminal"
          />
        </Tooltip>
        <Popover
          trigger="click"
          open={launcherOpen}
          onOpenChange={(open) => {
            setLauncherOpen(open);
            if (open) {
              setLauncherQuery("");
              setLauncherIndex(0);
            }
          }}
          placement="bottomRight"
          content={
            <div className="launcher-popover">
              <Input
                size="small"
                autoFocus
                placeholder="Search runnables"
                value={launcherQuery}
                onChange={(e) => setLauncherQuery(e.target.value)}
                onKeyDown={handleLauncherKeyDown}
                allowClear
              />
              <div className="launcher-list">
                {filteredRunnables.length === 0 ? (
                  <div className="launcher-empty">No runnables match</div>
                ) : (
                  filteredRunnables.map((r, i) => (
                    <button
                      key={r.id}
                      type="button"
                      className={`launcher-row${i === launcherIndex ? " launcher-row-active" : ""}`}
                      onClick={() => launch(r.commands)}
                      onMouseEnter={() => setLauncherIndex(i)}
                    >
                      <span className="launcher-name">{r.name}</span>
                      <span className="launcher-commands">{r.commands.join("  ")}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          }
        >
          <Tooltip title="Run an app">
            <Button
              type="text"
              size="small"
              icon={<RocketOutlined />}
              aria-label="Run an app"
            />
          </Tooltip>
        </Popover>
        <Tooltip title="Toggle vertical split">
          <Button
            type="text"
            size="small"
            icon={<ColumnWidthOutlined />}
            onClick={toggleVertical}
            style={{ color: state.vertical ? palette.primary : undefined }}
            aria-label="Toggle vertical split"
          />
        </Tooltip>
        <Tooltip title="Toggle bottom split">
          <Button
            type="text"
            size="small"
            icon={<InsertRowBelowOutlined />}
            onClick={toggleBottom}
            style={{ color: state.bottom ? palette.primary : undefined }}
            aria-label="Toggle bottom split"
          />
        </Tooltip>
      </div>
    </div>
  );
}

export default TerminalTabBar;
