from odoo import fields, models


class IrUiView(models.Model):
    _inherit = 'ir.ui.view'

    type = fields.Selection(selection_add=[('nested', 'Nested')])

    def _get_view_info(self):
        info = super()._get_view_info()
        info['nested'] = {'icon': 'fa fa-sitemap'}
        return info
