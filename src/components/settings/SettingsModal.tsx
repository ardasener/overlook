import { useEffect, useState } from "react";
import { CheckOutlined, DeleteOutlined, EditOutlined, PictureOutlined, PlusOutlined, QuestionCircleOutlined, RedoOutlined } from "@ant-design/icons";
import { Button, Input, InputNumber, message, Modal, Select, Slider, Switch, Tabs, Tooltip } from "antd";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { PALETTES } from "../../themes/palettes";
import {
  BACKGROUND_BLUR_MAX,
  BACKGROUND_OPACITY_MAX,
  BACKGROUND_OPACITY_MIN,
  TERM_FONT_OPTIONS,
  TERM_SIZE_MAX,
  TERM_SIZE_MIN,
  UI_FONT_OPTIONS,
  UI_SCALE_MAX,
  UI_SCALE_MIN,
  UI_SCALE_STEP,
  snapUiScale,
  useSettings,
  type Runnable,
} from "../../settings/SettingsContext";
import { TERM_FONT_STACKS } from "../../themes/xterm";
import { isMacOS } from "../../lib/platform";
import {
  ACTION_LABELS,
  ACTIONS,
  DEFAULT_KEYBINDINGS,
  comboFromEvent,
  formatCombo,
  type ActionId,
} from "../../shortcuts/keybindings";
import "./SettingsModal.css";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

/** Fresh runnable with a stable unique id. */
function makeRunnableId(): string {
  return `runnable-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Draft form state for a runnable being added or edited. */
interface RunnableDraft {
  name: string;
  commands: string[];
}

const EMPTY_DRAFT: RunnableDraft = { name: "", commands: [""] };

/** Sentinel editingId marking the "adding a new runnable" editor state. */
const NEW_RUNNABLE_ID = "__new__";

/** A combo captured while recording: action id + which slot (primary/alt). */
interface RecordingState {
  action: ActionId;
  slot: "primary" | "alt";
}

function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { settings, update } = useSettings();

  // Runnable editor: null = closed; NEW_RUNNABLE_ID = adding; else editing.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RunnableDraft>(EMPTY_DRAFT);

  const resetEditor = () => {
    setEditingId(null);
    setDraft({ ...EMPTY_DRAFT });
  };

  const startEdit = (r: Runnable) => {
    setEditingId(r.id);
    setDraft({ name: r.name, commands: [...r.commands] });
  };

  const startAdd = () => {
    setEditingId(NEW_RUNNABLE_ID);
    setDraft({ ...EMPTY_DRAFT });
  };

  const saveDraft = () => {
    const name = draft.name.trim();
    const commands = draft.commands.map((c) => c.trim()).filter((c) => c.length > 0);
    if (!name || commands.length === 0) return;
    if (editingId !== null && editingId !== NEW_RUNNABLE_ID) {
      update({
        runnables: settings.runnables.map((r) =>
          r.id === editingId ? { ...r, name, commands } : r,
        ),
      });
    } else {
      update({ runnables: [...settings.runnables, { id: makeRunnableId(), name, commands }] });
    }
    resetEditor();
  };

  const removeRunnable = (id: string) => {
    update({ runnables: settings.runnables.filter((r) => r.id !== id) });
    if (editingId === id) resetEditor();
  };

  // ── Keybinding recording ──────────────────────────────────────────────

  const [recording, setRecording] = useState<RecordingState | null>(null);

  const startRecording = (action: ActionId, slot: "primary" | "alt") => {
    setRecording({ action, slot });
  };

  const cancelRecording = () => setRecording(null);

  const saveRecording = (e: KeyboardEvent) => {
    if (!recording) return;
    // Escape clears the alt binding (when recording one) or cancels.
    if (e.key === "Escape") {
      if (recording.slot === "alt") {
        const current = settings.keybindings[recording.action];
        update({
          keybindings: {
            ...settings.keybindings,
            [recording.action]: { ...current, alt: null },
          },
        });
      }
      cancelRecording();
      return;
    }
    const modHeld = e.metaKey || e.ctrlKey;
    if (!modHeld) return; // require Cmd/Ctrl to protect TUI keys
    const combo = formatCombo(comboFromEvent(e));
    const current = settings.keybindings[recording.action];
    const next = {
      ...current,
      [recording.slot]: combo,
    };
    update({ keybindings: { ...settings.keybindings, [recording.action]: next } });
    cancelRecording();
  };

  // While recording, capture the next keydown anywhere in the modal.
  useEffect(() => {
    if (!recording) return;
    const onKeyDown = (e: KeyboardEvent) => {
      // stopImmediatePropagation prevents the app's shortcut hook (a sibling
      // capture listener) from also dispatching this keypress.
      e.preventDefault();
      e.stopImmediatePropagation();
      saveRecording(e);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, settings.keybindings, update]);

  const resetKeybindings = () => {
    update({ keybindings: DEFAULT_KEYBINDINGS });
    cancelRecording();
  };

  // ── Background image ────────────────────────────────────────────────────

  const pickBackground = async () => {
    const picked = await openDialog({
      multiple: false,
      filters: [
        { name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif", "heic"] },
      ],
    });
    if (typeof picked !== "string") return; // canceled
    try {
      // Rust copies the file into the app config dir and returns its full
      // absolute path; the wallpaper layer serves it via convertFileSrc.
      const storedPath = await invoke<string>("appearance_set_background", { path: picked });
      update({
        background: { ...settings.background, image: storedPath },
      });
    } catch (err) {
      void message.error(String(err));
    }
  };

  const clearBackground = async () => {
    try {
      await invoke("appearance_clear_background");
    } catch {
      /* ignore — file may already be gone */
    }
    update({ background: { ...settings.background, image: null } });
  };

  return (
    <Modal
      title="Settings"
      open={open}
      onCancel={() => {
        resetEditor();
        onClose();
      }}
      footer={null}
      width={560}
      centered
    >
      {/* Palette CSS variables live on the document root, so the portal
          content inherits theme colors automatically. */}
      <Tabs
        defaultActiveKey="appearance"
        size="small"
        items={[
          {
            key: "appearance",
            label: "Appearance",
            children: (
              <section className="settings-section">
                <h3 className="settings-section-title">Appearance</h3>

                <div className="settings-field">
                  <span className="settings-label">Theme</span>
                  <div className="theme-grid">
                    {PALETTES.map((p) => {
                      const selected = settings.themeId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className={`theme-card${selected ? " theme-card-active" : ""}`}
                          onClick={() => update({ themeId: p.id })}
                          style={selected ? { borderColor: p.primary } : undefined}
                          aria-pressed={selected}
                        >
                          <span className="theme-card-dots">
                            <i style={{ background: p.bg }} />
                            <i style={{ background: p.surface }} />
                            <i style={{ background: p.text }} />
                            <i style={{ background: p.primary }} />
                          </span>
                          <span className="theme-card-name">{p.name}</span>
                          {selected && (
                            <span
                              className="theme-card-check"
                              style={{ background: p.primary, color: p.primaryText }}
                            >
                              <CheckOutlined />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="settings-field">
                  <span className="settings-label">UI font</span>
                  <Select
                    value={settings.uiFont}
                    onChange={(uiFont) => update({ uiFont })}
                    style={{ width: 220 }}
                    options={UI_FONT_OPTIONS.map((o) => ({
                      value: o.id,
                      label: o.name,
                    }))}
                  />
                </div>

                <div className="settings-field">
                  <span className="settings-label">UI scale</span>
                  <Tooltip title="Relational text size multiplier">
                    <InputNumber
                      value={settings.uiScale}
                      min={UI_SCALE_MIN}
                      max={UI_SCALE_MAX}
                      step={UI_SCALE_STEP}
                      addonAfter="×"
                      onChange={(v) => update({ uiScale: snapUiScale(v ?? 1) })}
                    />
                  </Tooltip>
                </div>

                {!isMacOS() && (
                  <div className="settings-field">
                    <span className="settings-label">Window control position</span>
                    <Tooltip title="Where the minimize / maximize / close buttons sit (not used on macOS)">
                      <Select
                        value={settings.windowControlsPosition}
                        onChange={(windowControlsPosition) =>
                          update({ windowControlsPosition })
                        }
                        style={{ width: 220 }}
                        options={[
                          { value: "right", label: "Right" },
                          { value: "left", label: "Left" },
                        ]}
                      />
                    </Tooltip>
                  </div>
                )}

                <h3 className="settings-section-title">Background image</h3>

                {settings.background.image ? (
                  <div className="settings-stack">
                    <Button
                      icon={<PictureOutlined />}
                      onClick={() => void pickBackground()}
                      block
                    >
                      Change photo
                    </Button>
                    <div className="settings-slider-row">
                      <span className="settings-label">Blur</span>
                      <Slider
                        min={0}
                        max={BACKGROUND_BLUR_MAX}
                        value={settings.background.blur}
                        onChange={(blur) =>
                          update({ background: { ...settings.background, blur } })
                        }
                      />
                    </div>
                    <div className="settings-slider-row">
                      <span className="settings-label">Opacity</span>
                      <Slider
                        min={BACKGROUND_OPACITY_MIN}
                        max={BACKGROUND_OPACITY_MAX}
                        step={0.05}
                        value={settings.background.opacity}
                        onChange={(opacity) =>
                          update({ background: { ...settings.background, opacity } })
                        }
                      />
                    </div>
                    <Button danger onClick={() => void clearBackground()}>
                      Clear background
                    </Button>

                    <div className="settings-toggle-row">
                      <span className="settings-label">
                        Remap background colors
                        <Tooltip title="Makes the terminal's default background transparent so apps that use the default background let your wallpaper show through. Colored text highlights still work.">
                          <QuestionCircleOutlined className="settings-info-icon" />
                        </Tooltip>
                      </span>
                      <Switch
                        checked={settings.background.remapBackground}
                        onChange={(remapBackground) =>
                          update({ background: { ...settings.background, remapBackground } })
                        }
                      />
                    </div>

                    <div className="settings-toggle-row">
                      <span className="settings-label">
                        Strip background colors
                        <Tooltip title="Removes background color codes from app output, forcing all backgrounds transparent. More aggressive — may also remove highlighted backgrounds inside apps.">
                          <QuestionCircleOutlined className="settings-info-icon" />
                        </Tooltip>
                      </span>
                      <Switch
                        checked={settings.background.stripBackground}
                        onChange={(stripBackground) =>
                          update({ background: { ...settings.background, stripBackground } })
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <div className="settings-field">
                    <Button icon={<PictureOutlined />} onClick={() => void pickBackground()} block>
                      Upload photo
                    </Button>
                  </div>
                )}

                <h3 className="settings-section-title">Terminal</h3>

                <div className="settings-field">
                  <span className="settings-label">Font</span>
                  <Select
                    value={settings.termFont}
                    onChange={(termFont) => update({ termFont })}
                    style={{ width: 220 }}
                    options={TERM_FONT_OPTIONS.map((o) => ({
                      value: o.id,
                      label: <span style={{ fontFamily: TERM_FONT_STACKS[o.id] }}>{o.name}</span>,
                    }))}
                  />
                </div>

                <div className="settings-field">
                  <span className="settings-label">Default font size</span>
                  <Tooltip title="Baseline terminal font size; Ctrl/Cmd + scroll zooms individual panes">
                    <InputNumber
                      value={settings.termSize}
                      min={TERM_SIZE_MIN}
                      max={TERM_SIZE_MAX}
                      onChange={(v) => update({ termSize: v ?? 13 })}
                    />
                  </Tooltip>
                </div>
              </section>
            ),
          },
          {
            key: "runnables",
            label: "Runnables",
            children: (
              <section className="settings-section">
                <h3 className="settings-section-title">Runnables</h3>

        {settings.runnables.map((r) => (
          <div key={r.id} className="runnable-row">
            <div className="runnable-meta">
              <span className="runnable-name">{r.name}</span>
              <span className="runnable-commands">{r.commands.join("  ")}</span>
            </div>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => startEdit(r)}
              aria-label={`Edit ${r.name}`}
            />
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => removeRunnable(r.id)}
              aria-label={`Delete ${r.name}`}
            />
          </div>
        ))}

        {editingId !== null ? (
          <div className="runnable-editor">
            <Input
              size="small"
              placeholder="Name (e.g. Monitor)"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
            {draft.commands.map((cmd, i) => (
              <div key={i} className="runnable-command-row">
                <Input
                  size="small"
                  placeholder="Command (e.g. btop --color=dark)"
                  value={cmd}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      commands: d.commands.map((c, j) => (j === i ? e.target.value : c)),
                    }))
                  }
                />
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  disabled={draft.commands.length <= 1}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      commands: d.commands.filter((_, j) => j !== i),
                    }))
                  }
                  aria-label="Remove command"
                />
              </div>
            ))}
            <Button
              type="dashed"
              size="small"
              block
              icon={<PlusOutlined />}
              onClick={() => setDraft((d) => ({ ...d, commands: [...d.commands, ""] }))}
            >
              Add command
            </Button>
            <div className="runnable-editor-actions">
              <Button size="small" onClick={resetEditor}>
                Cancel
              </Button>
              <Button
                size="small"
                type="primary"
                onClick={saveDraft}
                disabled={!draft.name.trim() || draft.commands.every((c) => !c.trim())}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="dashed"
            size="small"
            block
            icon={<PlusOutlined />}
            onClick={startAdd}
          >
            Add runnable
          </Button>
        )}
              </section>
            ),
          },
          {
            key: "keybindings",
            label: "Keybindings",
            children: (
              <section className="settings-section">
                <div className="keybindings-header">
                  <h3 className="settings-section-title">Keybindings</h3>
                  <Button size="small" icon={<RedoOutlined />} onClick={resetKeybindings}>
                    Reset to defaults
                  </Button>
                </div>
                <div className="keybindings-list">
                  {ACTIONS.map((action) => {
                    const kb = settings.keybindings[action];
                    return (
                      <div key={action} className="keybinding-row">
                        <span className="keybinding-label">{ACTION_LABELS[action]}</span>
                        <div className="keybinding-slots">
                          <Button
                            size="small"
                            className={
                              recording?.action === action && recording.slot === "primary"
                                ? "keybinding-recording"
                                : undefined
                            }
                            onClick={() => startRecording(action, "primary")}
                          >
                            {recording?.action === action && recording.slot === "primary"
                              ? "Press keys…"
                              : kb?.primary}
                          </Button>
                          <Button
                            size="small"
                            className={
                              recording?.action === action && recording.slot === "alt"
                                ? "keybinding-recording"
                                : undefined
                            }
                            onClick={() => startRecording(action, "alt")}
                          >
                            {recording?.action === action && recording.slot === "alt"
                              ? "Press keys…"
                              : (kb?.alt ?? "None")}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ),
          },
        ]}
      />
    </Modal>
  );
}
export default SettingsModal;
