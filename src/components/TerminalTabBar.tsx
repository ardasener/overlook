import type { CSSProperties } from "react";
import { Button, Tabs, Tooltip } from "antd";
import {
  ColumnWidthOutlined,
  InsertRowBelowOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useSettings } from "../settings/SettingsContext";
import { useTerminalLayout } from "../layout/TerminalLayoutContext";
import { isMacOS } from "../lib/platform";
import "./TerminalTabBar.css";

/**
 * Tab strip (control-only — content is rendered by the split layout) plus the
 * new-tab and split-toggle actions. The container is a macOS drag region:
 * AntD tab items (role="tab") and buttons are clickable and block dragging;
 * empty bar space drags the window.
 */
function TerminalTabBar() {
  const { state, slotOf, newTab, closeTab, selectTab, toggleVertical, toggleBottom } =
    useTerminalLayout();
  const { palette } = useSettings();

  const focusedTabId =
    state.focusedSlot < state.slots.length ? state.slots[state.focusedSlot] : null;

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
          return { key: tab.id, label: <span style={style}>{tab.title}</span>, closable: true };
        })}
      />
      <div className="tabbar-actions">
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
