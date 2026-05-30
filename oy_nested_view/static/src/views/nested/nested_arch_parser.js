import { ListArchParser } from "@web/views/list/list_arch_parser";
import { Field } from "@web/views/fields/field";
import { exprToBoolean } from "@web/core/utils/strings";
import { evaluateExpr } from "@web/core/py_js/py";

/**
 * Nested arch is identical to list arch, plus extra attributes:
 *  - parent_field        Many2one self-referencing field used for hierarchy
 *  - default_expanded    "1" to render all nodes expanded on load
 *
 * Parser delegates the heavy lifting to ListArchParser by cloning the
 * <nested> root into a <list> element, then augments the resulting archInfo.
 */
export class NestedArchParser extends ListArchParser {
    parse(xmlDoc, models, modelName) {
        const parentField = xmlDoc.getAttribute("parent_field") || "parent_id";

        let options = {};
        const optionsAttr = xmlDoc.getAttribute("options");
        if (optionsAttr) {
            try {
                options = evaluateExpr(optionsAttr) || {};
            } catch (_e) {
                options = {};
            }
        }
        let defaultExpanded;
        if ("unfold_all" in options) {
            defaultExpanded = Boolean(options.unfold_all);
        } else {
            defaultExpanded = exprToBoolean(xmlDoc.getAttribute("default_expanded") || "0");
        }

        const listDoc = xmlDoc.ownerDocument.createElement("list");
        for (const { name, value } of xmlDoc.attributes) {
            if (name === "parent_field" || name === "default_expanded") continue;
            listDoc.setAttribute(name, value);
        }
        for (const child of [...xmlDoc.childNodes]) {
            listDoc.appendChild(child.cloneNode(true));
        }

        const archInfo = super.parse(listDoc, models, modelName);

        // Ensure parent_field is always fetched even if not in the arch.
        const fields = models[modelName].fields;
        const fieldNodes = archInfo.fieldNodes || {};
        const alreadyDeclared = Object.values(fieldNodes).some(
            (n) => n.name === parentField,
        );
        if (!alreadyDeclared && fields[parentField]) {
            const synthNode = xmlDoc.ownerDocument.createElement("field");
            synthNode.setAttribute("name", parentField);
            synthNode.setAttribute("column_invisible", "1");
            const fieldInfo = Field.parseFieldNode(synthNode, models, modelName, "list");
            fieldNodes[`${parentField}_hidden`] = fieldInfo;
        }

        return {
            ...archInfo,
            fieldNodes,
            parentField,
            defaultExpanded,
        };
    }
}
