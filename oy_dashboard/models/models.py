# -*- coding: utf-8 -*-

from odoo import api, fields, models

class OyBoard(models.AbstractModel):
    _name = 'oy.board'
    _description = "OY Board"
    
    id = fields.Id()

    @api.model_create_multi
    def create(self, vals_list):
        return self
    @api.model
    def get_view(self, view_id=None, view_type='form', **options):
        """
        Overrides orm field_view_get.
        @return: Dictionary of Fields, arch and toolbar.
        """
        res = super().get_view(view_id, view_type, **options)

        view = self.env.ref('board.board_my_dash_view')
        view_id = view.id
        custom_view = self.env['ir.ui.view.custom'].sudo().search([('user_id', '=', self.env.uid), ('ref_id', '=', view_id)], limit=1)
        if custom_view:
            res.update({
                'custom_view_id': custom_view.id,
                'arch': custom_view.arch
            })

        res['arch'] = self._arch_preprocessing(res['arch'])
        return res
    
    @api.model
    def _arch_preprocessing(self, arch):
        from lxml import etree

        def remove_unauthorized_children(node):
            for child in node.iterchildren():
                if child.tag == 'action' and child.get('invisible'):
                    node.remove(child)
                else:
                    remove_unauthorized_children(child)
            return node

        archnode = etree.fromstring(arch)
        archnode.set('js_class', 'oy_board')
        return etree.tostring(remove_unauthorized_children(archnode), pretty_print=True, encoding='unicode')
