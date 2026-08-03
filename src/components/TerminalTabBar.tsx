import type { CSSProperties, MouseEvent } from "react";
import { useRef } from "react";
import { Button, Tabs, Tooltip } from "antd";
import {
  ColumnWidthOutlined,
  InsertRowBelowOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useSettings } from "../settings/SettingsContext";
import { useTerminalLayout } from "../layout/TerminalLayoutContext";
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
  const { state, slotOf, newTab, closeTab, selectTab, toggleVertical, toggleBottom, beginDrag } =
    useTerminalLayout();
  const { palette } = useSettings();

  const focusedTabId =
    state.focusedSlot < state.slots.length ? state.slots[state.focusedSlot] : null;

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

  return (
    <div
      className="terminal-tabbar"
      data-tauri-drag-region="deep"
      style={isMacOS() ? ({ paddingLeft: 80 } as CSSProperties) : undefined}
    >
      <Tabs
        className="terminal-tabs"
        type="editable-card"
        size="small"
        hideAdd
        activeKey={focusedTabId ?? undefined}
        onChange={(key) => selectTab(key)}
        onEdit={(key, action) => {
          if (action === "remove") closeTab(String(key));
        }}
        items={state.tabs.map((tab) => {
          const slot = slotOf(tab.id);
          const focused = tab.id === focusedTabId;
          const style: CSSProperties = {
            color: slot !== null ? palette.accents[slot] : "var(--ol-text-muted)",
            fontWeight: focused ? 600 : 400,
          };
          return {
            key: tab.id,
            label: (
              <span
                className="terminal-tab-label"
                onMouseDown={handleLabelMouseDown(tab.id)}
                onMouseMove={handleLabelMouseMove(tab.id)}
                onMouseUp={clearPress}
                style={style}
              >
                {tab.title}
              </span>
            ),
            closable: true,
          };
        })}
      />
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
