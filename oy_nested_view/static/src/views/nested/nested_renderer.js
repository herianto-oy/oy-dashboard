import { useState } from "@odoo/owl";
import { ListRenderer } from "@web/views/list/list_renderer";

const LEVEL_INDENT_PX = 24;
const LINE_OFFSET_PX = 14;
const STUB_EXTEND_PX = 10;

/**
 * NestedRenderer — extends ListRenderer.
 *
 * Reuses every list rendering feature (selection, sort, optional columns,
 * decorations, header buttons, inline edit, Field components, formatters,
 * tooltips, etc.). Overrides only:
 *   - rowsTemplate          → iterates `visibleEntries` (folded children
 *                              hidden) and propagates `row` context.
 *   - recordRowTemplate     → injects indent + caret + tree-line overlay
 *                              into the first field cell.
 *   - drag-drop wiring      → adds dragstart/dragover/drop handlers using
 *                              the existing list TR (drag handle = whole row).
 */
export class NestedRenderer extends ListRenderer {
    static template = "oy_nested_view.NestedRenderer";
    static rowsTemplate = "oy_nested_view.NestedRenderer.Rows";
    static recordRowTemplate = "oy_nested_view.NestedRenderer.RecordRow";

    setup() {
        super.setup();
        this.parentField = this.props.list.model.parentField;
        this.treeState = useState(this.props.list.model.treeState);
        this.drag = useState({
            draggedId: null,
            originX: 0,
            originLevel: 0,
            hoverRowId: null,
            hoverLevel: 0,
            targetParentId: false,
            valid: false,
        });
    }

    // ---- tree flattening ----------------------------------------------

    get visibleEntries() {
        const records = this.props.list.records;
        const model = this.props.list.model;
        const recordsByParent = {};
        for (const r of records) {
            const pid = model.parentIdOf(r) || 0;
            (recordsByParent[pid] = recordsByParent[pid] || []).push(r);
        }
        const rootIds = new Set(this.treeState.rootIds || []);
        const roots = records.filter((r) => rootIds.has(r.resId));
        const entries = [];
        const placed = new Set();
        const walk = (recs, level, ancestorLastFlags) => {
            recs.forEach((rec, i) => {
                const isLast = i === recs.length - 1;
                entries.push({
                    record: rec,
                    level,
                    ancestorLastFlags,
                    isLastSibling: isLast,
                });
                placed.add(rec.id);
                if (this.treeState.foldMap[rec.resId] === false) {
                    const children = recordsByParent[rec.resId] || [];
                    if (children.length) {
                        walk(children, level + 1, [...ancestorLastFlags, isLast]);
                    }
                }
            });
        };
        walk(roots, 0, []);
        // Only append truly new (in-edit, no resId yet) records.
        // Folded descendants must NOT reappear here as roots.
        for (const r of records) {
            if (placed.has(r.id)) continue;
            placed.add(r.id);
            const isRoot = !model.parentIdOf(r);
            // Tampilkan: record baru (in-edit), atau root yang belum sempat
            // masuk rootIds (mis. baru di-save & load belum complete).
            if (r.isNew || !r.resId || isRoot) {
                entries.push({
                    record: r,
                    level: 0,
                    ancestorLastFlags: [],
                    isLastSibling: true,
                });
            }
        }
        // Defensive: pastikan tidak ada t-key duplicate (Owl crash kalau ada).
        const seen = new Set();
        return entries.filter((e) => {
            if (seen.has(e.record.id)) return false;
            seen.add(e.record.id);
            return true;
        });
    }

    hasChildrenRec(record) {
        const model = this.props.list.model;
        if (model.hasChildren(record.resId)) return true;
        return this.props.list.records.some(
            (r) => model.parentIdOf(r) === record.resId,
        );
    }

    isFolded(record) {
        return this.props.list.model.isFolded(record.resId);
    }

    async toggleFold(record) {
        this.props.list.model.toggleFold(record.resId);
    }

    indentWidthStyle(level) {
        return `width: ${level * LEVEL_INDENT_PX}px;`;
    }

    overlayStyle(level) {
        return `width: ${level * LEVEL_INDENT_PX}px;`;
    }

    primaryCellStyle(level) {
        return `--nested-indent: ${level * LEVEL_INDENT_PX}px;`;
    }

    rowStyle(row) {
        const level = (row && row.level) || 0;
        return `--nested-indent: ${level * LEVEL_INDENT_PX}px;`;
    }

    caretAbsStyle(level) {
        return `left: ${level * LEVEL_INDENT_PX + 4}px;`;
    }

    segLeftStyle(colIndex) {
        return `left: ${colIndex * LEVEL_INDENT_PX + LINE_OFFSET_PX}px;`;
    }

    segHStyle(colIndex) {
        const left = colIndex * LEVEL_INDENT_PX + LINE_OFFSET_PX;
        const width = LEVEL_INDENT_PX - LINE_OFFSET_PX + STUB_EXTEND_PX;
        return `left: ${left}px; width: ${width}px;`;
    }

    cornerStyle(colIndex) {
        const left = colIndex * LEVEL_INDENT_PX + LINE_OFFSET_PX;
        const width = LEVEL_INDENT_PX - LINE_OFFSET_PX + STUB_EXTEND_PX;
        return `left: ${left}px; width: ${width}px;`;
    }

    descenderStyle(level) {
        return `left: ${level * LEVEL_INDENT_PX + LINE_OFFSET_PX}px;`;
    }

    // ---- drag-drop -----------------------------------------------------

    onDragStart(ev, record, level) {
        this.drag.draggedId = record.resId;
        this.drag.originX = ev.clientX;
        this.drag.originLevel = level;
        this.drag.hoverRowId = null;
        this.drag.targetParentId = false;
        this.drag.valid = false;
        ev.dataTransfer.effectAllowed = "move";
        try {
            ev.dataTransfer.setData("text/plain", String(record.resId));
        } catch (_e) { /* some browsers reject */ }
    }

    onDragEnd() {
        this.drag.draggedId = null;
        this.drag.hoverRowId = null;
        this.drag.targetParentId = false;
        this.drag.valid = false;
    }

    onDragOver(ev, hoverRecord, hoverLevel) {
        if (!this.drag.draggedId || this.drag.draggedId === hoverRecord.resId) return;
        ev.preventDefault();
        ev.dataTransfer.dropEffect = "move";

        const dx = ev.clientX - this.drag.originX;
        const delta = Math.floor(dx / LEVEL_INDENT_PX);
        const desiredAbs = Math.max(0, this.drag.originLevel + delta);
        const targetLevel = Math.min(desiredAbs, hoverLevel + 1);
        const newParentId = this._resolveParentForLevel(hoverRecord, hoverLevel, targetLevel);

        let valid = true;
        if (newParentId && this.props.list.model._isDescendant(newParentId, this.drag.draggedId)) {
            valid = false;
        }
        if (newParentId === this.drag.draggedId) valid = false;

        this.drag.hoverRowId = hoverRecord.resId;
        this.drag.hoverLevel = targetLevel;
        this.drag.targetParentId = newParentId;
        this.drag.valid = valid;
    }

    async onDrop(ev) {
        ev.preventDefault();
        if (!this.drag.draggedId || !this.drag.valid) {
            this.onDragEnd();
            return;
        }
        const draggedId = this.drag.draggedId;
        const newParentId = this.drag.targetParentId;
        this.onDragEnd();
        const records = this.props.list.records;
        const dragged = records.find((r) => r.resId === draggedId);
        if (!dragged) return;
        await this.props.list.model.updateParent(dragged, newParentId);
    }

    _resolveParentForLevel(hoverRecord, hoverLevel, targetLevel) {
        if (targetLevel <= 0) return false;
        const model = this.props.list.model;
        let current = hoverRecord;
        let level = hoverLevel;
        while (current && level > targetLevel - 1) {
            const pid = model.parentIdOf(current);
            current = pid ? this.props.list.records.find((r) => r.resId === pid) : null;
            level -= 1;
        }
        return current ? current.resId : false;
    }

    isDropTarget(recordId) {
        return (
            this.drag.draggedId &&
            this.drag.valid &&
            this.drag.targetParentId === recordId
        );
    }

    isInvalidHover(recordId) {
        return (
            this.drag.draggedId &&
            !this.drag.valid &&
            this.drag.hoverRowId === recordId
        );
    }

    nestedRowClasses(row) {
        const parts = ["o_nested_row"];
        if (!this.hasChildrenRec(row.record)) parts.push("o_nested_row_leaf");
        if (this.isDropTarget(row.record.resId)) parts.push("o_nested_drop_target");
        if (this.isInvalidHover(row.record.resId)) parts.push("o_nested_drop_invalid");
        if (this.drag.draggedId === row.record.resId) parts.push("o_nested_dragging");
        return parts.join(" ");
    }

    // ---- toolbar actions ---------------------------------------------

    async foldAll() {
        this.props.list.model.foldAll();
    }

    async unfoldAll() {
        this.props.list.model.unfoldAll();
    }
}
