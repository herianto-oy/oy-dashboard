# -*- coding: utf-8 -*-
{
    'name': "OY Dashboard",
    'summary': "Custom dashboard with drag-and-drop and resizable content",
    'description': """
        This module provides a flexible dashboard that allows users to rearrange and resize widgets 
        with drag-and-drop and resize features.
    """,
    'author': "Herianto OY",
    'website': "https://www.linkedin.com/in/herianto-oy/",
    'category': 'Productivity',
    'version': '0.1',
    'depends': ['spreadsheet_dashboard', 'board'],
    'data': [
        'security/ir.model.access.csv',
        'views/views.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'oy_dashboard/static/src/**/*.js',
            'oy_dashboard/static/src/**/*.css',
            'oy_dashboard/static/src/**/*.scss',
            'oy_dashboard/static/src/**/*.xml',
        ],
    },
    'license': 'LGPL-3', 
}

