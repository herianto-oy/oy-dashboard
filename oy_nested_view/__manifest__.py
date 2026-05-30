{
    'name': 'OY Nested View',
    'summary': 'List-like nested view with hierarchical drag-drop',
    'description': """
Custom 'nested' view type for Odoo 18. Renders records hierarchically via a
parent_field arch attribute. Pagination counts root records only. Drag rows
right to nest deeper, left to surface; ~20 px per level. Includes a sales-team
demo model.
""",
    'version': '18.0.0.1.0',
    'category': 'Tools',
    'author': 'OY',
    'license': 'LGPL-3',
    'depends': ['web', 'base'],
    'data': [
        'security/ir.model.access.csv',
        'views/nested_sales_demo_views.xml',
        'data/nested_sales_demo_data.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'oy_nested_view/static/src/views/nested/**/*.js',
            'oy_nested_view/static/src/views/nested/**/*.xml',
            'oy_nested_view/static/src/views/nested/**/*.scss',
        ],
    },
    'application': False,
    'installable': True,
}
