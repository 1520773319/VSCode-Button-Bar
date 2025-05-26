import * as vscode from 'vscode';
import { ButtonsTreeDataProvider, ButtonItem, parseString } from './buttonsTreeDataProvider';

export function activate(context: vscode.ExtensionContext) {
	const treeDataProvider = new ButtonsTreeDataProvider(context);
	vscode.window.createTreeView('buttons-view', { treeDataProvider });

	// 注册：新增按钮命令
	context.subscriptions.push(
	vscode.commands.registerCommand('myExtension.addButton', async () => {
		const name = await vscode.window.showInputBox({
		prompt: 'Enter button name',
		placeHolder: 'e.g. My Custom Button'
		});

		if (name) {
		treeDataProvider.addButton(context, name);
		}
	})
	);

	// 注册：执行按钮命令（左键）
	context.subscriptions.push(
		vscode.commands.registerCommand('myExtension.runButton', (item: ButtonItem) => {
			parseString(`${item.content}`);
		})
	);

	// 注册：编辑按钮内容命令（右键）
	context.subscriptions.push(
		vscode.commands.registerCommand('myExtension.editButtonContent', async (item: ButtonItem) => {
				const newContent = await vscode.window.showInputBox({
				prompt: `Edit content for "${item.label}"`,
				value: item.content,
				// multiline: true
			});

			if (newContent !== undefined && newContent !== item.content) {
				treeDataProvider.updateButtonContent(context, item.id, newContent);
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('myExtension.renameButton', async (item: ButtonItem) => {
				const newName = await vscode.window.showInputBox({
				prompt: 'Enter new name for the button',
				value: item.label
			});

			if (newName && newName !== item.label) {
				treeDataProvider.renameButton(context, item.id, newName);
			}
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('myExtension.deleteButton', async (item: ButtonItem) => {
				const confirm = await vscode.window.showQuickPick(['Yes', 'No'], {
				placeHolder: `Are you sure you want to delete "${item.label}"?`
			});

			if (confirm === 'Yes') {
				treeDataProvider.deleteButton(context, item.id);
			}
		})
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
