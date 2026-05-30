from odoo import api, fields, models


class NestedSalesDemo(models.Model):
    _name = 'oy.nested.sales.demo'
    _description = 'Nested View Sales Demo'
    _order = 'sequence, id'
    _parent_store = True
    _parent_name = 'parent_id'

    name = fields.Char(required=True)
    role = fields.Selection(
        [
            ('head', 'Head of Sales'),
            ('manager', 'Manager'),
            ('sales', 'Sales Representative'),
        ],
        required=True,
        default='sales',
    )
    quota = fields.Monetary(currency_field='currency_id')
    won = fields.Monetary(currency_field='currency_id')
    gap_to_quota = fields.Monetary(
        currency_field='currency_id',
        compute='_compute_gap_to_quota',
        store=True,
    )
    avatar = fields.Image(max_width=128, max_height=128)
    currency_id = fields.Many2one(
        'res.currency',
        default=lambda self: self.env.company.currency_id,
    )
    parent_id = fields.Many2one(
        'oy.nested.sales.demo',
        string='Reports To',
        ondelete='set null',
        index=True,
    )
    parent_path = fields.Char(index=True, unaccent=False)
    sequence = fields.Integer(default=10)

    @api.depends('quota', 'won')
    def _compute_gap_to_quota(self):
        for record in self:
            record.gap_to_quota = (record.quota or 0.0) - (record.won or 0.0)
