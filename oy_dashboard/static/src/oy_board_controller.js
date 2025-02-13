/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";
import { rpc } from "@web/core/network/rpc";
import { useService } from "@web/core/utils/hooks";
import { ConfirmationDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { renderToString } from "@web/core/utils/render";
import { standardViewProps } from "@web/views/standard_view_props";
import { BoardAction } from "@board/board_action";
import { blockDom, onMounted, Component, useState, useRef } from "@odoo/owl";

export class OyBoardController extends Component {
    static template = "oy_dashboard.OyBoardView";
    static components = { BoardAction };
    static props = {
        ...standardViewProps,
        board: Object,
    };

    setup() {
        this.board = useState(this.props.board);
        this.elGs = useRef("gridstack");
        this.btnEdit = useRef("btn-edit");
        this.btnCancel = useRef("btn-cancel");
        this.btnSave = useRef("btn-save");
        this.dialogService = useService("dialog");

        onMounted(() => {
            if(this.elGs.el) {
                this.grid = GridStack.init({
                        column: 12,          
                        cellHeight: 50,
                        margin: 5,
                        disableResize: true,
                        disableDrag: true,
                        resizable: {
                            handles: 'all'
                        }
                });
    
                this.btnEdit.el.classList.toggle("d-none");
            }
        });

    }

    editBoard() {
        this.btnToggle();
        this.grid.enableMove(true);
        this.grid.enableResize(true);
    }
    
    cancelBoard() {
        this.dialogService.add(ConfirmationDialog, {
            body: _t("Are you sure that you want to cancel?"),
            confirm: () => {
                window.location.reload();
            },
            cancel: () => {},
        });
    }

    saveBoard() {
        this.btnToggle();

        const widgets = this.grid.getGridItems();

        const templateFn = renderToString.app.getTemplate("board.arch");
        const bdom = templateFn(this.board, {});
        const root = document.createElement("rendertostring");
        blockDom.mount(bdom, root);

        const result = xmlSerializer.serializeToString(root);
        const arch = result.slice(result.indexOf("<", 1), result.indexOf("</rendertostring>"));


        const parser = new DOMParser();
        const archDOM = parser.parseFromString(arch, "text/xml")
        const actions = archDOM.querySelectorAll('action');
        actions.forEach((actionNode, index) => {
            const widget = widgets[index].gridstackNode;
            actionNode.setAttribute('gs-x', widget.x);
            actionNode.setAttribute('gs-y', widget.y);
            actionNode.setAttribute('gs-w', widget.w);
            actionNode.setAttribute('gs-h', widget.h);
        });

        const archUpdated = xmlSerializer.serializeToString(archDOM);

        rpc("/web/view/edit_custom", {
            custom_id: this.board.customViewId,
            arch: archUpdated,
        });
        this.env.bus.trigger("CLEAR-CACHES");
    }

    closeAction(column, action) {

        this.dialogService.add(ConfirmationDialog, {
            body: _t("Are you sure that you want to remove this item?"),
            confirm: () => {
                const indexColumn = this.board.columns.indexOf(column);
                const indexAction = column.actions.indexOf(action);
                const elItem = this.elGs.el.querySelectorAll(`#gs-item-${indexColumn}-${indexAction}`);
                this.grid.removeWidget(elItem);
                column.actions.splice(indexAction, 1);
                this.saveBoard();
                this.btnToggle();
            },
            cancel: () => {},
        });
    }

    btnToggle(){
        this.btnEdit.el.classList.toggle("d-none");
        this.btnCancel.el.classList.toggle("d-none");
        this.btnSave.el.classList.toggle("d-none");
        const btnClose = this.elGs.el.querySelectorAll('.gs-btn-close');
        btnClose.forEach(el => el.classList.toggle('d-none'));
    }
}

const xmlSerializer = new XMLSerializer();


