import * as vscode from 'vscode';

export interface ButtonData {
  id: string;
  label: string;
  content: string;
}

export class ButtonItem extends vscode.TreeItem {
  constructor(
    public readonly id: string,
    public label: string,
    public content: string = '',
    public commandId: string = 'myExtension.runButton'
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);

    this.tooltip = `Click to run "${label}"`;
    this.command = {
      command: commandId,
      title: 'Run',
      arguments: [this]
    };

    // 设置 contextValue，用于 package.json 中 when 判断
    this.contextValue = 'custom-button-item'; // 标记为普通按钮
    this.iconPath = new vscode.ThemeIcon('circle-filled');
  }
}

export class ButtonsTreeDataProvider implements vscode.TreeDataProvider<ButtonItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ButtonItem | undefined | void> = new vscode.EventEmitter();
    readonly onDidChangeTreeData: vscode.Event<ButtonItem | undefined | void> = this._onDidChangeTreeData.event;

    private buttons: ButtonItem[] = [];
    public dragAndDropController: vscode.TreeDragAndDropController<ButtonItem>;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadButtonsFromGlobalState(context);
        this.dragAndDropController = this.createDragAndDropController();
    }

    private createDragAndDropController(): vscode.TreeDragAndDropController<ButtonItem> {
        const controller: vscode.TreeDragAndDropController<ButtonItem> = {
            dragMimeTypes: ['application/vnd.code.tree.button'],
            dropMimeTypes: ['application/vnd.code.tree.button'],
            handleDrag: async (source, data, token) => {
                // 只支持单个拖拽，保存 id
                data.set('application/vnd.code.tree.button', new vscode.DataTransferItem(JSON.stringify(source.map(item => item.id))));
            },
            handleDrop: async (target, data, token) => {
                const raw = data.get('application/vnd.code.tree.button');
                if (!raw) { return; }
                let draggedIds: string[] = [];
                if (typeof raw.value === 'string') {
                    draggedIds = JSON.parse(raw.value);
                } else if (raw && typeof raw.asString === 'function') {
                    await raw.asString().then((str: string) => { draggedIds = JSON.parse(str); });
                }
                if (!draggedIds.length) { return; }
                // 只支持单个拖拽
                const draggedId = draggedIds[0];
                const draggedIdx = this.buttons.findIndex(b => b.id === draggedId);
                if (draggedIdx === -1) { return; }
                const draggedBtn = this.buttons[draggedIdx];
                this.buttons.splice(draggedIdx, 1);
                let targetIdx = target ? this.buttons.findIndex(b => b.id === target.id) : this.buttons.length;
                if (targetIdx === -1) { targetIdx = this.buttons.length; }
                this.buttons.splice(targetIdx, 0, draggedBtn);
                this.saveButtonsToGlobalState(this.context);
                this._onDidChangeTreeData.fire();
            }
        };
        return controller;
    }

    private loadButtonsFromGlobalState(context: vscode.ExtensionContext) {
        const savedButtons = context.globalState.get<ButtonData[]>('savedButtons', []);
        this.buttons = savedButtons.map(data => new ButtonItem(data.id, data.label, data.content));
    }

    private saveButtonsToGlobalState(context: vscode.ExtensionContext) {
        const dataToSave: ButtonData[] = this.buttons.map(button => ({
            id: button.id,
            label: button.label,
            content: button.content
        }));
        context.globalState.update('savedButtons', dataToSave);
    }

    getTreeItem(element: ButtonItem): vscode.TreeItem {
        return element;
    }
    
    getChildren(): Thenable<ButtonItem[]> {
        const addBtn = new ButtonItem('add-btn', 'Add Button', '', 'myExtension.addButton');
        addBtn.contextValue = 'add-button-item'; // 特殊标识
        addBtn.iconPath = new vscode.ThemeIcon('add');
        return Promise.resolve([addBtn, ...this.buttons]);
    }

    refreshItemIcon(context: vscode.ExtensionContext) {
        for (const element of this.buttons) {
            element.iconPath = new vscode.ThemeIcon('circle-filled');
        }
        this.saveButtonsToGlobalState(context);
        this._onDidChangeTreeData.fire();
    }

    addButton(context: vscode.ExtensionContext, name: string) {
        const newItem = new ButtonItem(
            `btn-${Date.now()}`,
            name,
            `Default content for ${name}`,
            'myExtension.runButton'
        );

        this.buttons.push(newItem);
        this.saveButtonsToGlobalState(context);
        this._onDidChangeTreeData.fire();
    }

    deleteButton(context: vscode.ExtensionContext, id: string) {
        this.buttons = this.buttons.filter(b => b.id !== id);
        this.saveButtonsToGlobalState(context);
        this._onDidChangeTreeData.fire();
    }

    renameButton(context: vscode.ExtensionContext, id: string, name: string) {
        const button = this.buttons.find(b => b.id === id);
        if(button){
            button.label = name;
        }
        this.saveButtonsToGlobalState(context);
        this._onDidChangeTreeData.fire();
    }

    updateButtonContent(context: vscode.ExtensionContext, id: string, newContent: string) {
        const button = this.buttons.find(b => b.id === id);
        if (button) {
            button.content = newContent;
            this.saveButtonsToGlobalState(context);
            this._onDidChangeTreeData.fire();
        }
    }

    
}

export function parseString(input: string): void {
    let i = 0;
    const len = input.length;
    const buffer: string[] = [];
    let terminal = vscode.window.activeTerminal;

    // 如果没有终端，则创建一个新的，并设置位置为右侧面板
    if (!terminal) {
      terminal = vscode.window.createTerminal();
    }

    terminal.show();

    function flushBuffer() {
        if (buffer.length > 0) {
            if(terminal){
                terminal.sendText(buffer.join(''), false);
            }
            buffer.length = 0; // 清空缓冲区
        }
    }

    function processNext() {
        while (i < len) {
            const current = input[i];

            if (current === '\\' && i + 1 < len) {
                const next = input[i + 1];

                // 先把前面的缓存输出
                flushBuffer();

                if (next === 'n') {
                    if(terminal){
                        terminal.sendText('\n', false); // 换行
                    }
                    i += 2;
                    continue;
                } else if (next === 'p') {
                    i += 2;

                    // 异步处理暂停
                    setTimeout(() => {
                        processNext();
                    }, 1000);
                    return;
                } else {
                    // 不是\n或\p的情况，当作普通字符加入缓存
                    buffer.push(current, next);
                    i += 2;
                }
            } else {
                // 普通字符，加入缓存
                buffer.push(current);
                i++;
            }
        }

        // 最后清空剩余缓存
        flushBuffer();
    }

    processNext();
}