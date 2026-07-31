import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useTerminalLayout } from "../layout/TerminalLayoutContext";
import TerminalHost from "../modules/terminal/TerminalHost";

/**
 * Positions every tab host into its panel slot (or hides parked ones) and
 * renders placeholders for empty panels. Hosts are keyed by tab id and never
 * re-parented — only their CSS slot class changes — so PTY sessions survive
 * tab switches, parking, and panel reassignment.
 */
function SplitLayout() {
  const { state, slotOf, focusSlot, newTab } = useTerminalLayout();

  const layoutClass = `layout-area${state.vertical ? " vertical" : ""}${state.bottom ? " bottom" : ""}`;

  return (
    <div className={layoutClass}>
      {state.tabs.map((tab) => {
        const slot = slotOf(tab.id);
        return (
          <div
            key={tab.id}
            className={slot !== null ? `slot slot-${slot}` : "slot host-hidden"}
          >
            <TerminalHost tabId={tab.id} visible={slot !== null} />
          </div>
        );
      })}

      {/* Placeholders for empty panels. */}
      {state.slots[0] === null && (
        <SlotPlaceholder slot={0} onActivate={() => { focusSlot(0); newTab(); }} />
      )}
      {state.vertical && state.slots[1] === null && (
        <SlotPlaceholder slot={1} onActivate={() => { focusSlot(1); newTab(); }} />
      )}
      {state.bottom && state.slots[2] === null && (
        <SlotPlaceholder slot={2} onActivate={() => { focusSlot(2); newTab(); }} />
      )}
    </div>
  );
}

interface SlotPlaceholderProps {
  slot: number;
  onActivate: () => void;
}

function SlotPlaceholder({ slot, onActivate }: SlotPlaceholderProps) {
  return (
    <div className={`slot slot-${slot} slot-placeholder`}>
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
