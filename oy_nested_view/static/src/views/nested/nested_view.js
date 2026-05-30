import { registry } from "@web/core/registry";
import { listView } from "@web/views/list/list_view";
import { NestedArchParser } from "./nested_arch_parser";
import { NestedController } from "./nested_controller";
import { NestedModel } from "./nested_model";
import { NestedRenderer } from "./nested_renderer";

/**
 * Nested view registration — extends the upstream `listView` object, replacing
 * Controller, Renderer, ArchParser and Model with our nested variants. All
 * remaining list features (pager, selection menu, optional columns, sorting,
 * decorations, header buttons, inline edit, etc.) are inherited untouched.
 */
export const nestedView = {
    ...listView,
    type: "nested",
    display_name: "Nested",
    icon: "fa fa-sitemap",
    multiRecord: true,
    Controller: NestedController,
    Renderer: NestedRenderer,
    ArchParser: NestedArchParser,
    Model: NestedModel,
    buttonTemplate: "web.ListView.Buttons",

    props(genericProps, view, config) {
        const props = listView.props(genericProps, view, config);
        return {
            ...props,
            Model: NestedModel,
            Renderer: NestedRenderer,
        };
    },
};

registry.category("views").add("nested", nestedView);
