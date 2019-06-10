import { Injectable, Autowired } from '@ali/common-di';
import { CommandContribution, CommandRegistry, Command } from '@ali/ide-core-common';
import { KeybindingContribution, KeybindingRegistry, Logger, ClientAppContribution } from '@ali/ide-core-browser';
import { Domain } from '@ali/ide-core-common/lib/di-helper';
import { MenuContribution, MenuModelRegistry } from '@ali/ide-core-common/lib/menu';
import { ActivatorBarService } from '@ali/ide-activator-bar/lib/browser/activator-bar.service';
import { FileTree } from './file-tree.view';
import { EDITOR_BROWSER_COMMANDS } from '@ali/ide-editor';
import { CONTEXT_SINGLE_MENU, CONTEXT_MUTI_MENU, CONTEXT_FOLDER_MENU } from './file-tree.view';
import FileTreeService from './file-tree.service';
import { URI } from '@ali/ide-core-common';

export const CONSOLE_COMMAND: Command = {
  id: 'filetree.console',
};

export const FILETREE_BROWSER_COMMANDS: {
  [key: string]: Command,
} = {
  DELETE_FILE: {
    id: 'filetree.delete.file',
  },
  RENAME_FILE: {
    id: 'filetree.rename.file',
  },
  NEW_FILE: {
    id: 'filetree.new.file',
  },
  NEW_FOLDER: {
    id: 'filetree.new.filefolder',
  },
};

export namespace FileTreeContextSingleMenu {
  // 1_, 2_用于菜单排序，这样能保证分组顺序顺序
  export const OPEN = [...CONTEXT_SINGLE_MENU, '1_open'];
  export const OPERATOR = [...CONTEXT_SINGLE_MENU, '2_operator'];
}

export namespace FileTreeContextMutiMenu {
  // 1_, 2_用于菜单排序，这样能保证分组顺序顺序
  export const OPEN = [...CONTEXT_MUTI_MENU, '1_open'];
  export const OPERATOR = [...CONTEXT_MUTI_MENU, '2_operator'];
}

export namespace FileTreeContextFolderMenu {
  // 1_, 2_用于菜单排序，这样能保证分组顺序顺序
  export const OPEN = [...CONTEXT_FOLDER_MENU, '1_open'];
  export const OPERATOR = [...CONTEXT_FOLDER_MENU, '2_operator'];
}

@Injectable()
@Domain(ClientAppContribution, CommandContribution, KeybindingContribution, MenuContribution)
export class FileTreeContribution implements CommandContribution, KeybindingContribution, MenuContribution, ClientAppContribution {

  @Autowired()
  private activatorBarService: ActivatorBarService;

  @Autowired()
  private filetreeService: FileTreeService;

  @Autowired()
  logger: Logger;

  onStart() {
    this.activatorBarService.append({iconClass: 'fa-file-code-o', component: FileTree});
  }

  registerCommands(commands: CommandRegistry): void {
    commands.registerCommand(CONSOLE_COMMAND, {
      execute: () => {
        // tslint:disable-next-line
        this.logger.log('file tree  console..');
      },
    });
    commands.registerCommand({
      id: FILETREE_BROWSER_COMMANDS.DELETE_FILE.id,
      label: 'Delete File',
    }, {
      execute: (uris: URI[]) => {
        this.filetreeService.deleteFiles(uris);
      },
    });
    commands.registerCommand({
      id: FILETREE_BROWSER_COMMANDS.RENAME_FILE.id,
      label: 'Rename File',
    }, {
      execute: (uris: URI[]) => {
        // 默认使用uris中下标为0的uri作为创建基础
        this.logger.log('Rename File', uris);
      },
    });
    commands.registerCommand({
      id: FILETREE_BROWSER_COMMANDS.NEW_FILE.id,
      label: 'New File',
    }, {
      execute: (uris: URI[]) => {
        // 默认使用uris中下标为0的uri作为创建基础
        this.logger.log('New File', uris);
        this.filetreeService.createFile(uris[0].toString());
      },
    });
    commands.registerCommand({
      id: FILETREE_BROWSER_COMMANDS.NEW_FOLDER.id,
      label: 'New File Folder',
    }, {
      execute: (uris: URI[]) => {
        // 默认使用uris中下标为0的uri作为创建基础
        this.logger.log('New File Folder', uris);
        this.filetreeService.createFileFolder(uris[0].toString());
      },
    });
  }

  registerMenus(menus: MenuModelRegistry): void {

    // 单选菜单
    menus.registerMenuAction(FileTreeContextSingleMenu.OPEN, {
      label: '新建文件',
      commandId: FILETREE_BROWSER_COMMANDS.NEW_FILE.id,
    });
    menus.registerMenuAction(FileTreeContextSingleMenu.OPEN, {
      label: '新建文件夹',
      commandId: FILETREE_BROWSER_COMMANDS.NEW_FOLDER.id,
    });
    menus.registerMenuAction(FileTreeContextSingleMenu.OPEN, {
      label: '打开文件',
      commandId: EDITOR_BROWSER_COMMANDS.openResource,
    });
    menus.registerMenuAction(FileTreeContextSingleMenu.OPERATOR, {
      label: '删除文件',
      commandId: FILETREE_BROWSER_COMMANDS.DELETE_FILE.id,
    });
    menus.registerMenuAction(FileTreeContextSingleMenu.OPERATOR, {
      label: '重命名',
      commandId:  FILETREE_BROWSER_COMMANDS.RENAME_FILE.id,
    });

    // 多选菜单，移除部分选项
    menus.registerMenuAction(FileTreeContextMutiMenu.OPEN, {
      label: '新建文件',
      commandId: FILETREE_BROWSER_COMMANDS.NEW_FILE.id,
    });
    menus.registerMenuAction(FileTreeContextMutiMenu.OPEN, {
      label: '新建文件夹',
      commandId: FILETREE_BROWSER_COMMANDS.NEW_FOLDER.id,
    });
    menus.registerMenuAction(FileTreeContextMutiMenu.OPERATOR, {
      label: '删除文件',
      commandId: FILETREE_BROWSER_COMMANDS.DELETE_FILE.id,
    });

    // 文件夹菜单
    menus.registerMenuAction(FileTreeContextFolderMenu.OPEN, {
      label: '新建文件',
      commandId: FILETREE_BROWSER_COMMANDS.NEW_FILE.id,
    });
    menus.registerMenuAction(FileTreeContextFolderMenu.OPEN, {
      label: '新建文件夹',
      commandId: FILETREE_BROWSER_COMMANDS.NEW_FOLDER.id,
    });
    menus.registerMenuAction(FileTreeContextFolderMenu.OPERATOR, {
      label: '删除文件',
      commandId: FILETREE_BROWSER_COMMANDS.DELETE_FILE.id,
    });
    menus.registerMenuAction(FileTreeContextFolderMenu.OPERATOR, {
      label: '重命名',
      commandId:  FILETREE_BROWSER_COMMANDS.RENAME_FILE.id,
    });
  }

  registerKeybindings(keybindings: KeybindingRegistry): void {
    keybindings.registerKeybinding({
      command: CONSOLE_COMMAND.id,
      keybinding: 'ctrl+cmd+1',
    });
  }
}
