import { useState } from "react";
import { CheckOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Input, InputNumber, Modal, Select, Tooltip } from "antd";
import { PALETTES } from "../../themes/palettes";
import {
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
      </section>

      <section className="settings-section">
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
    </Modal>
  );
}
export default SettingsModal;
