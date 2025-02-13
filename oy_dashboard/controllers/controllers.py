# -*- coding: utf-8 -*-
# from odoo import http


# class OyDashboard(http.Controller):
#     @http.route('/oy_dashboard/oy_dashboard', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/oy_dashboard/oy_dashboard/objects', auth='public')
#     def list(self, **kw):
#         return http.request.render('oy_dashboard.listing', {
#             'root': '/oy_dashboard/oy_dashboard',
#             'objects': http.request.env['oy_dashboard.oy_dashboard'].search([]),
#         })

#     @http.route('/oy_dashboard/oy_dashboard/objects/<model("oy_dashboard.oy_dashboard"):obj>', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('oy_dashboard.object', {
#             'object': obj
#         })

