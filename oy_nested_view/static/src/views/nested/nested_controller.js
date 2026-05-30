import { ListController } from "@web/views/list/list_controller";

/**
 * NestedController — extends ListController.
 *
 * Inherits all list view machinery (pager, selection menu, action buttons,
 * keyboard shortcuts, header buttons, export, etc). Two augmentations:
 *   - injects `archInfo` into modelParams so NestedModel sees parentField /
 *     defaultExpanded;
 *   - exposes fold/unfold delegates for the renderer toolbar.
 */
export class NestedController extends ListController {
    static template = "oy_nested_view.NestedController";

    get modelParams() {
        const params = super.modelParams;
        params.archInfo = this.archInfo;
        return params;
    }

    async onRecordSaved(record) {
        const res = await super.onRecordSaved(record);
        // Reload supaya rootIds + descendants + tree state ikut update.
        await this.model.load();
        return res;
    }

    async onFoldAll() {
        this.model.foldAll();
    }

    async onUnfoldAll() {
        this.model.unfoldAll();
    }
}
