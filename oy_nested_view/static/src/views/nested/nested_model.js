import { reactive } from "@odoo/owl";
import { RelationalModel } from "@web/model/relational_model/relational_model";
import { getFieldsSpec } from "@web/model/relational_model/utils";
import { orderByToString } from "@web/search/utils/order_by";

/**
 * NestedModel — extends RelationalModel.
 *
 * Strategy:
 *  - `_loadUngroupedList` is overridden to issue TWO web_search_read calls:
 *      1. ROOTS only (domain += [parent_field, '=', false]) — paginated.
 *      2. DESCENDANTS of those roots (id child_of root_ids).
 *  - Combined records are returned; `length` is root count only so the pager
 *    counts only roots.
 *  - Tree state (foldMap, childCountByParent) lives in `this.treeState`.
 */
export class NestedModel extends RelationalModel {
    setup(params, services) {
        super.setup(params, services);
        this.archInfo = params.archInfo || {};
        this.parentField = this.archInfo.parentField || "parent_id";
        this.treeState = reactive({
            foldMap: {},
            childCountByParent: {},
            rootIds: [],
        });
    }

    async _loadUngroupedList(config) {
        const orderBy = (config.orderBy || []).filter((o) => o.name !== "__count");
        const baseDomain = config.domain || [];
        const rootDomain = [...baseDomain, [this.parentField, "=", false]];
        const spec = getFieldsSpec(config.activeFields, config.fields, config.context);
        const kwargs = {
            specification: spec,
            offset: config.offset || 0,
            order: orderByToString(orderBy),
            limit: config.limit,
            context: { bin_size: true, ...config.context },
            count_limit:
                config.countLimit !== Number.MAX_SAFE_INTEGER ? config.countLimit + 1 : undefined,
        };
        const rootResult = await this.orm.webSearchRead(config.resModel, rootDomain, kwargs);
        const rootRecords = rootResult.records || [];
        const rootIds = rootRecords.map((r) => r.id);

        let descendantRecords = [];
        if (rootIds.length) {
            try {
                const descResult = await this.orm.webSearchRead(
                    config.resModel,
                    [
                        ["id", "child_of", rootIds],
                        [this.parentField, "!=", false],
                    ],
                    {
                        specification: spec,
                        context: kwargs.context,
                        order: kwargs.order,
                    },
                );
                descendantRecords = descResult.records || [];
            } catch (err) {
                console.warn("[NestedModel] descendants query failed:", err);
                descendantRecords = [];
            }
        }

        // Build tree state from raw records (use raw shape — id + parent[parentField]).
        const allRecords = [...rootRecords, ...descendantRecords];
        const childCounts = {};
        for (const id of rootIds) childCounts[id] = 0;
        for (const r of descendantRecords) {
            const raw = r[this.parentField];
            const pid = raw && typeof raw === "object" ? raw.id : (Array.isArray(raw) ? raw[0] : raw);
            if (pid) {
                childCounts[pid] = (childCounts[pid] || 0) + 1;
            }
            childCounts[r.id] = childCounts[r.id] || 0;
        }
        this.treeState.childCountByParent = childCounts;
        this.treeState.rootIds = rootIds;

        const foldMap = {};
        for (const r of allRecords) {
            foldMap[r.id] = !this.archInfo.defaultExpanded;
        }
        this.treeState.foldMap = foldMap;

        return { records: allRecords, length: rootResult.length };
    }

    // ---- tree state helpers --------------------------------------------

    isFolded(recordId) {
        return this.treeState.foldMap[recordId] !== false;
    }

    hasChildren(recordId) {
        return (this.treeState.childCountByParent[recordId] || 0) > 0;
    }

    toggleFold(recordId) {
        this.treeState.foldMap[recordId] = !this.isFolded(recordId);
        this.notify();
    }

    foldAll() {
        for (const id of Object.keys(this.treeState.foldMap)) {
            this.treeState.foldMap[id] = true;
        }
        this.notify();
    }

    unfoldAll() {
        for (const id of Object.keys(this.treeState.foldMap)) {
            this.treeState.foldMap[id] = false;
        }
        this.notify();
    }

    parentIdOf(record) {
        const raw = record.data[this.parentField];
        if (!raw) return false;
        if (Array.isArray(raw)) return raw[0] || false;
        if (typeof raw === "object") return raw.id || raw.resId || false;
        return raw;
    }

    // ---- drag-drop -----------------------------------------------------

    async updateParent(record, newParentId) {
        if (!record) return;
        if (newParentId && this._isDescendant(newParentId, record.resId)) return;
        const currentParentId = this.parentIdOf(record);
        if ((currentParentId || false) === (newParentId || false)) return;

        // Many2one update value must be a [id, display_name] tuple.
        const value = newParentId ? [newParentId, ""] : false;
        await record.update({ [this.parentField]: value });
        await record.save();
        await this.load();
    }

    _isDescendant(candidateId, ancestorId) {
        if (!candidateId) return false;
        const records = (this.root && this.root.records) || [];
        const byId = {};
        for (const r of records) byId[r.resId] = r;
        let cur = candidateId;
        const seen = new Set();
        while (cur && !seen.has(cur)) {
            if (cur === ancestorId) return true;
            seen.add(cur);
            const rec = byId[cur];
            if (!rec) return false;
            cur = this.parentIdOf(rec);
        }
        return false;
    }
}

NestedModel.services = [...RelationalModel.services];
