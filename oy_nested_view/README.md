# OY Nested View

Hierarchical list-style view for Odoo 18. Extends `web.ListRenderer` so every standard list feature (selection, sort, optional columns, decorations, header buttons, inline edit, export) works as-is — adds tree indent, fold/unfold, and horizontal drag-drop to change parent.

## Installation
1. Copy `oy_nested_view/` into the Odoo `addons` directory.
2. Restart the Odoo server.
3. **Apps → Update Apps List → search "OY Nested View" → Install**.

## Module Dependencies
- `web`
- `base`

## Using the View Type

### 1. Model requirement
Target model must declare a self-referencing Many2one (`parent_field`) and is strongly recommended to enable `_parent_store` for fast cycle detection:

```python
class MyModel(models.Model):
    _name = 'my.model'
    _parent_store = True
    _parent_name = 'parent_id'

    name = fields.Char()
    parent_id = fields.Many2one('my.model', ondelete='set null', index=True)
    parent_path = fields.Char(index=True, unaccent=False)
```

### 2. View arch
Use `<nested>` as the root tag. All standard `<list>` features are inherited (decorations, optional, editable, header buttons, etc.):

```xml
<record id="view_my_model_nested" model="ir.ui.view">
    <field name="name">my.model.nested</field>
    <field name="model">my.model</field>
    <field name="type">nested</field>
    <field name="arch" type="xml">
        <nested parent_field="parent_id"
                limit="80"
                options="{'unfold_all': True}"
                editable="bottom"
                decoration-danger="state == 'blocked'">
            <header>
                <button name="action_recalculate" type="object" string="Recalculate"/>
            </header>
            <field name="name"/>
            <field name="role" widget="badge"/>
            <field name="quota" widget="monetary" optional="show"/>
            <field name="currency_id" column_invisible="1"/>
        </nested>
    </field>
</record>
```

### 3. Action
Reference the view with `view_mode="nested,form"`:

```xml
<record id="action_my_model" model="ir.actions.act_window">
    <field name="name">My Hierarchy</field>
    <field name="res_model">my.model</field>
    <field name="view_mode">nested,form</field>
</record>
```

## Arch Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `parent_field` | str | `parent_id` | Many2one field used for parent/child relation. |
| `limit` | int | `80` | Page size (counts ROOT records only). |
| `options` | dict | `{}` | JSON dict of options. Supported keys below. |
| Plus every standard `<list>` attribute | | | `editable`, `multi_edit`, `default_order`, `decoration-*`, `class`, `open_form_view`, `expand`, etc. |

### `options` keys

| Key | Type | Description |
|---|---|---|
| `unfold_all` | bool | `True` → start fully expanded; `False` → start collapsed. Legacy alias: `default_expanded="1"\|"0"`. |

### Per-field attributes
All standard list `<field>` attributes are supported — `optional="show|hide"`, `widget`, `column_invisible`, `decoration-*`, `readonly`, `required`, etc.

## Behavior

- **Pager** counts ROOT records only (`parent_field IS NULL`). Descendants paginate with their parent.
- **Drag-drop** — drag any row left/right with the mouse. Each ~24 px horizontal delta shifts one tree level. Drop persists immediately via `Record.update({parent_field: [id, name]}).save()`. Cycle guard (a record cannot become a descendant of itself) uses `parent_path`.
- **Highlight while dragging** — target parent row outlined in `--bs-primary`; invalid drop outlined in `--bs-danger`.
- **Fold/Unfold all** buttons appear in the control panel toolbar.
- **Caret** per row when the record has children. Click toggles single node fold state. Smooth rotation animation on toggle. Children fade-in when made visible.
- **Tree-line color** follows `--bs-table-border-color`. Lines render above table borders.
- **Inline edit / Add a line** — supported (use `editable="top"|"bottom"`). New rows render at level 0; drag to desired parent after save.
- **All standard list features** carry over: selection checkboxes + bulk actions, sortable headers, optional columns dropdown, decorations, header buttons, export, multi-edit, tooltips.

## Demo
Module ships with `oy.nested.sales.demo` and menu **OY Nested → Sales Hierarchy** containing a 3-level sales-team hierarchy to showcase the view.

## Technical Notes
- View registered under view-type `nested` (also added to `ir.ui.view.type` selection).
- `NestedModel` extends `RelationalModel`; `_loadUngroupedList` issues two `web_search_read` queries (roots + descendants of those roots).
- `NestedRenderer` extends `ListRenderer` via QWeb `t-inherit-mode="primary"`; only the `Rows` and `RecordRow` templates are modified — every other list template is reused unchanged.
- `NestedController` extends `ListController` and injects fold/unfold buttons into `layout-buttons` slot.
