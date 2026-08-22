import { useEffect, useState } from "react";
import { BorderOutlined, CloseOutlined, MinusOutlined, SwitcherOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isMacOS } from "../lib/platform";
export type WindowControlsSide = "left" | "right";

interface WindowControlsProps {
  side: WindowControlsSide;
}

/**
 * Software window controls for undecorated windows (Linux/Windows), styled
 * exactly like the tab bar's other icon actions (AntD text buttons). macOS
 * keeps its native traffic lights and renders nothing here.
 *
 * Maximized state is tracked through the window API so the maximize control
 * can swap to the restore glyph. Left placement mirrors the macOS
 * traffic-light order (close · minimize · maximize); right placement uses
 * the Windows order.
 */
function WindowControls({ side }: WindowControlsProps) {
  const [maximized, setMaximized] = useState(false);

  // Track maximized state: initial read plus updates on every resize (the
  // maximize/restore transition always resizes the window).
  useEffect(() => {
    if (isMacOS()) return;
    const win = getCurrentWindow();
    let cancelled = false;
    let unlisten: (() => void) | null = null;
    const sync = () => {
      void win.isMaximized().then((value) => {
        if (!cancelled) setMaximized(value);
      });
    };
    void win.onResized(() => sync()).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
      sync();
    });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  if (isMacOS()) return null;

  const minimize = (
    <Button
      key="minimize"
      type="text"
      size="small"
      icon={<MinusOutlined />}
      onClick={() => void getCurrentWindow().minimize()}
      aria-label="Minimize window"
    />
  );
  const maximize = (
    <Button
      key="maximize"
      type="text"
      size="small"
      icon={maximized ? <SwitcherOutlined /> : <BorderOutlined />}
      onClick={() => void getCurrentWindow().toggleMaximize()}
      aria-label={maximized ? "Restore window" : "Maximize window"}
    />
  );
  const close = (
    <Button
      key="close"
      type="text"
      size="small"
      icon={<CloseOutlined />}
      onClick={() => void getCurrentWindow().close()}
      aria-label="Close window"
    />
  );

  const controls = side === "left" ? [close, minimize, maximize] : [minimize, maximize, close];

  return (
    <div className="tabbar-actions" role="group" aria-label="Window controls">
      {controls}
    </div>
  );
}

export default WindowControls;
