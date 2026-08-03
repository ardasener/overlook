import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useTerminalLayout } from "../layout/TerminalLayoutContext";
import TerminalHost from "../modules/terminal/TerminalHost";

/**
 * Positions every tab host into its panel slot (or hides parked/inactive
 * ones) and renders placeholders for empty panels. Hosts are keyed by tab id
 * and never re-parented — only their CSS slot class changes — so PTY sessions
 * survive tab switches, parking, panel reassignment, and worktree switches.
 *
 * All tabs across all worktrees stay mounted; a tab is visible when its
 * worktree is the active one and it sits in a slot of that layout.
 */
function SplitLayout() {
  const { state, allTabs, activeWorktree, slotOf, focusSlot, newTab, drag } =
    useTerminalLayout();

  const layoutClass = `layout-area${state.vertical ? " vertical" : ""}${state.bottom ? " bottom" : ""}`;

  const draggedTab = drag ? allTabs.find((t) => t.id === drag.tabId) : null;

  return (
    <div className={layoutClass}>
      {allTabs.map((tab) => {
        const slot = slotOf(tab.id);
        const visible = tab.worktree === activeWorktree && slot !== null;
        const active = visible && slot === state.focusedSlot;
        const dropTarget = visible && drag !== null && drag.overSlot === slot;
        const className = [
          "slot",
          visible ? `slot-${slot}` : "host-hidden",
          visible && active ? "slot-active" : visible ? "slot-inactive" : "",
          dropTarget ? "slot-drop-target" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <div key={tab.id} className={className}>
            <TerminalHost tabId={tab.id} slot={visible ? slot : null} visible={visible} />
          </div>
        );
      })}

      {/* Placeholders for empty panels (also drop targets). */}
      {state.slots[0] === null && (
        <SlotPlaceholder
          slot={0}
          highlighted={drag?.overSlot === 0}
          onActivate={() => {
            focusSlot(0);
            newTab();
          }}
        />
      )}
      {state.vertical && state.slots[1] === null && (
        <SlotPlaceholder
          slot={1}
          highlighted={drag?.overSlot === 1}
          onActivate={() => {
            focusSlot(1);
            newTab();
          }}
        />
      )}
      {state.bottom && state.slots[2] === null && (
        <SlotPlaceholder
          slot={2}
          highlighted={drag?.overSlot === 2}
          onActivate={() => {
            focusSlot(2);
            newTab();
          }}
        />
      )}

      {/* Floating drag ghost following the pointer. */}
      {drag && draggedTab && (
        <div className="tab-drag-ghost" style={{ left: drag.x, top: drag.y }}>
          {draggedTab.title}
        </div>
      )}
    </div>
  );
}

interface SlotPlaceholderProps {
  slot: number;
  highlighted: boolean;
  onActivate: () => void;
}

function SlotPlaceholder({ slot, highlighted, onActivate }: SlotPlaceholderProps) {
  return (
    <div
      className={`slot slot-${slot} slot-placeholder${highlighted ? " slot-drop-target" : ""}`}
    >
      <Button
        type="text"
        size="small"
        icon={<PlusOutlined />}
        onClick={onActivate}
        className="slot-placeholder-button"
      >
        Create a terminal
      </Button>
    </div>
  );
}

export default SplitLayout;
