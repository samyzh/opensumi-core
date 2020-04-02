import { URI, ClientAppContribution, localize, CommandContribution, KeybindingContribution, TabBarToolbarContribution, FILE_COMMANDS, CommandRegistry, CommandService, SEARCH_COMMANDS, isWindows, IElectronNativeDialogService, ToolbarRegistry, KeybindingRegistry } from '@ali/ide-core-browser';
import { Domain } from '@ali/ide-core-common/lib/di-helper';
import { Autowired, INJECTOR_TOKEN, Injector } from '@ali/common-di';
import { FileTreeService } from './file-tree.service';
import { IMainLayoutService, MainLayoutContribution } from '@ali/ide-main-layout';
import { ExplorerContainerId } from '@ali/ide-explorer/lib/browser/explorer-contribution';
import { KAITIAN_MUTI_WORKSPACE_EXT, IWorkspaceService, UNTITLED_WORKSPACE } from '@ali/ide-workspace';
import { FileTree } from './file-tree';
import { SymlinkDecorationsProvider } from './symlink-file-decoration';
import { IDecorationsService } from '@ali/ide-decoration';
import { NextMenuContribution, IMenuRegistry, MenuId, ExplorerContextCallback } from '@ali/ide-core-browser/lib/menu/next';
import { FileTreeModelService } from './services/file-tree-model.service';
import { Directory } from './file-tree-nodes';
import { WorkbenchEditorService } from '@ali/ide-editor';
import * as copy from 'copy-to-clipboard';
import { IWindowService } from '@ali/ide-window';
import { IOpenDialogOptions, IWindowDialogService, ISaveDialogOptions } from '@ali/ide-overlay';
import { FilesExplorerFilteredContext } from '@ali/ide-core-browser/lib/contextkey/explorer';
import { FilesExplorerFocusedContext, FilesExplorerInputFocusedContext } from '@ali/ide-core-browser/lib/contextkey/explorer';
import { PasteTypes } from '../common';

export const ExplorerResourceViewId = 'file-explorer-next';

@Domain(NextMenuContribution, CommandContribution, KeybindingContribution, TabBarToolbarContribution, ClientAppContribution, MainLayoutContribution)
export class FileTreeContribution implements NextMenuContribution, CommandContribution, KeybindingContribution, TabBarToolbarContribution, ClientAppContribution, MainLayoutContribution {

  @Autowired(INJECTOR_TOKEN)
  private readonly injector: Injector;

  @Autowired(FileTreeService)
  private readonly fileTreeService: FileTreeService;

  @Autowired(IMainLayoutService)
  private readonly mainLayoutService: IMainLayoutService;

  @Autowired(IWorkspaceService)
  private readonly workspaceService: IWorkspaceService;

  @Autowired(FileTreeModelService)
  private readonly fileTreeModelService: FileTreeModelService;

  @Autowired(IDecorationsService)
  public readonly decorationService: IDecorationsService;

  @Autowired(WorkbenchEditorService)
  private readonly editorService: WorkbenchEditorService;

  @Autowired(CommandService)
  private readonly commandService: CommandService;

  @Autowired(IWindowDialogService)
  private readonly windowDialogService: IWindowDialogService;

  private isRendered = false;

  async onStart() {
    await this.fileTreeService.init();
    this.mainLayoutService.collectViewComponent({
      id: ExplorerResourceViewId,
      name: this.getWorkspaceTitle(),
      weight: 3,
      priority: 9,
      collapsed: false,
      component: FileTree,
    }, ExplorerContainerId);
    // 监听工作区变化更新标题
    this.workspaceService.onWorkspaceChanged(() => {
      const handler = this.mainLayoutService.getTabbarHandler(ExplorerContainerId);
      if (handler) {
        handler.updateViewTitle(ExplorerResourceViewId, this.getWorkspaceTitle());
      }
    });
  }

  onDidStart() {
    const symlinkDecorationsProvider = this.injector.get(SymlinkDecorationsProvider, [this.fileTreeService]);
    this.decorationService.registerDecorationsProvider(symlinkDecorationsProvider);
  }

  onDidRender() {
    this.isRendered = true;
    const handler = this.mainLayoutService.getTabbarHandler(ExplorerContainerId);
    if (handler) {
      handler.onActivate(() => {
        this.fileTreeModelService.performLocationOnHandleShow();
      });
    }
  }

  getWorkspaceTitle() {
    let resourceTitle = localize('file.empty.defaultTitle');
    const workspace = this.workspaceService.workspace;
    if (workspace) {
      const uri = new URI(workspace.uri);
      resourceTitle = uri.displayName;
      if (!workspace.isDirectory &&
        (resourceTitle.endsWith(`.${KAITIAN_MUTI_WORKSPACE_EXT}`))) {
        resourceTitle = resourceTitle.slice(0, resourceTitle.lastIndexOf('.'));
        if (resourceTitle === UNTITLED_WORKSPACE) {
          return localize('file.workspace.defaultTip');
        }
      }
    }
    return resourceTitle;
  }

  onReconnect() {
    this.fileTreeService.reWatch();
  }

  registerNextMenus(menuRegistry: IMenuRegistry): void {
    menuRegistry.registerMenuItem(MenuId.ExplorerContext, {
      command: FILE_COMMANDS.NEW_FILE.id,
      order: 1,
      group: '0_new',
      when: `!${FilesExplorerFilteredContext.raw}`,
    });

    menuRegistry.registerMenuItem(MenuId.ExplorerContext, {
      command: FILE_COMMANDS.NEW_FOLDER.id,
      order: 2,
      group: '0_new',
      when: `!${FilesExplorerFilteredContext.raw}`,
    });

    menuRegistry.registerMenuItem(MenuId.ExplorerContext, {
      command: FILE_COMMANDS.OPEN_RESOURCES.id,
      order: 1,
      group: '1_open',
    });

    menuRegistry.registerMenuItem(MenuId.ExplorerContext, {
      command: FILE_COMMANDS.OPEN_TO_THE_SIDE.id,
      order: 2,
      group: '1_open',
    });

    menuRegistry.registerMenuItem(MenuId.ExplorerContext, {
      command: FILE_COMMANDS.SEARCH_ON_FOLDER.id,
      order: 1,
      group: '2_search',
    });

    menuRegistry.registerMenuItem(MenuId.ExplorerContext, {
      command: FILE_COMMANDS.DELETE_FILE.id,
      order: 1,
      group: '2_operator',
      when: `!${FilesExplorerFilteredContext.raw}`,
    });
    menuRegistry.registerMenuItem(MenuId.ExplorerContext, {
      command: FILE_COMMANDS.RENAME_FILE.id,
      order: 3,
      group: '2_operator',
      when: `!${FilesExplorerFilteredContext.raw}`,
    });
    menuRegistry.registerMenuItem(MenuId.ExplorerContext, {
      command: FILE_COMMANDS.COMPARE_SELECTED.id,
      order: 2,
      group: '2_operator',
    });
    menuRegistry.registerMenuItem(MenuId.ExplorerContext, {
      command: FILE_COMMANDS.COPY_FILE.id,
      order: 1,
      group: '3_copy',
    });
    menuRegistry.registerMenuItem(MenuId.ExplorerContext, {
      command: FILE_COMMANDS.CUT_FILE.id,
      order: 2,
      group: '3_copy',
    });
    menuRegistry.registerMenuItem(MenuId.ExplorerContext, {
      command: FILE_COMMANDS.PASTE_FILE.id,
      order: 3,
      group: '3_copy',
      when: `!${FilesExplorerFilteredContext.raw}`,
    });
    menuRegistry.registerMenuItem(MenuId.ExplorerContext, {
      command: FILE_COMMANDS.COPY_PATH.id,
      group: '4_path',
    });
    menuRegistry.registerMenuItem(MenuId.ExplorerContext, {
      command: FILE_COMMANDS.COPY_RELATIVE_PATH.id,
      group: '4_path',
    });
  }

  registerCommands(commands: CommandRegistry) {
    commands.registerCommand(FILE_COMMANDS.SEARCH_ON_FOLDER, {
      execute: async (uri?: URI) => {
        let searchFolder = uri;

        if (!searchFolder) {
          if (this.fileTreeModelService.focusedFile) {
            searchFolder = this.fileTreeModelService.focusedFile.uri;
          } else {
            searchFolder = this.fileTreeModelService.selectedFiles[0].uri;
          }
        }
        let searchPath: string;
        if (this.fileTreeService.isMutiWorkspace) {
          // 多工作区额外处理
          for (const root of await this.workspaceService.roots) {
            const rootUri = new URI(root.uri);
            if (rootUri.isEqualOrParent(searchFolder)) {
              searchPath = `./${rootUri.relative(searchFolder)!.toString()}`;
              break;
            }
          }
        } else {
          if (this.workspaceService.workspace) {
            const rootUri = new URI(this.workspaceService.workspace.uri);
            if (rootUri.isEqualOrParent(searchFolder)) {
              searchPath = `./${rootUri.relative(searchFolder)!.toString()}`;
            }
          }
        }
        this.commandService.executeCommand(SEARCH_COMMANDS.OPEN_SEARCH.id, {includeValue: searchPath!});
      },
      isVisible: () => {
        return !!this.fileTreeModelService.focusedFile && Directory.is(this.fileTreeModelService.focusedFile);
      },
    });
    commands.registerCommand(FILE_COMMANDS.LOCATION, {
      execute: (uri?: URI) => {
        let locationUri = uri;

        if (!locationUri) {
          locationUri = this.fileTreeModelService.selectedFiles[0].uri;
        }
        if (locationUri && this.isRendered) {
          const handler = this.mainLayoutService.getTabbarHandler(ExplorerContainerId);
          if (!handler || !handler.isVisible || handler.isCollapsed(ExplorerResourceViewId)) {
            this.fileTreeModelService.locationOnShow(locationUri);
          } else {
            this.fileTreeModelService.location(locationUri);
          }
        }
      },
    });

    commands.registerCommand(FILE_COMMANDS.COLLAPSE_ALL, {
      execute: () => {
        const handler = this.mainLayoutService.getTabbarHandler(ExplorerContainerId);
        if (!handler || !handler.isVisible) {
          return;
        }
        this.fileTreeModelService.collapseAll();
      },
    });

    commands.registerCommand(FILE_COMMANDS.REFRESH_ALL, {
      execute: async () => {
        const handler = this.mainLayoutService.getTabbarHandler(ExplorerContainerId);
        if (!handler || !handler.isVisible) {
          return;
        }
        await this.fileTreeService.refresh();
      },
    });
    commands.registerCommand<ExplorerContextCallback>(FILE_COMMANDS.DELETE_FILE, {
      execute: (_, uris) => {
        if (!uris) {
          uris = this.fileTreeModelService.selectedFiles.map((file) => file.uri);
        }
        this.fileTreeModelService.deleteFileByUris(uris);
      },
      isVisible: () => {
        return this.fileTreeModelService.selectedFiles.length > 0;
      },
    });
    commands.registerCommand<ExplorerContextCallback>(FILE_COMMANDS.RENAME_FILE, {
      execute: (uri) => {
        if (!uri) {
          uri = this.fileTreeModelService.focusedFile!.uri;
        }
        this.fileTreeModelService.renamePrompt(uri);
      },
      isVisible: () => {
        return !!this.fileTreeModelService.focusedFile;
      },
    });
    commands.registerCommand<ExplorerContextCallback>(FILE_COMMANDS.NEW_FILE, {
      execute: async (uri) => {
        if (uri) {
          this.fileTreeModelService.newFilePrompt(uri);
        } else if (this.fileTreeModelService.selectedFiles && this.fileTreeModelService.selectedFiles.length > 0) {
          this.fileTreeModelService.newFilePrompt(this.fileTreeModelService.selectedFiles[0].uri);
        } else {
          let rootUri: URI;
          if (!this.fileTreeService.isMutiWorkspace) {
            rootUri = new URI(this.workspaceService.workspace?.uri);
          } else {
            rootUri = new URI((await this.workspaceService.roots)[0].uri);
          }
          this.fileTreeModelService.newFilePrompt(rootUri);
        }
      },
    });
    commands.registerCommand<ExplorerContextCallback>(FILE_COMMANDS.NEW_FOLDER, {
      execute: async (uri) => {
        if (uri) {
          this.fileTreeModelService.newDirectoryPrompt(uri);
        } else if (this.fileTreeModelService.selectedFiles && this.fileTreeModelService.selectedFiles.length > 0) {
          this.fileTreeModelService.newDirectoryPrompt(this.fileTreeModelService.selectedFiles[0].uri);
        } else {
          let rootUri: URI;
          if (!this.fileTreeService.isMutiWorkspace) {
            rootUri = new URI(this.workspaceService.workspace?.uri);
          } else {
            rootUri = new URI((await this.workspaceService.roots)[0].uri);
          }
          this.fileTreeModelService.newDirectoryPrompt(rootUri);
        }
      },
    });
    commands.registerCommand<ExplorerContextCallback>(FILE_COMMANDS.COMPARE_SELECTED, {
      execute: (_, uris) => {
        if (uris && uris.length) {
          const currentEditor = this.editorService.currentEditor;
          if (currentEditor && currentEditor.currentUri) {
            this.fileTreeService.compare(uris[0], currentEditor.currentUri);
          }
        }
      },
      isVisible: () => {
        return !!this.fileTreeModelService.focusedFile && !Directory.is(this.fileTreeModelService.focusedFile);
      },
    });
    commands.registerCommand<ExplorerContextCallback>(FILE_COMMANDS.OPEN_RESOURCES, {
      execute: (uri) => {
        this.fileTreeService.openAndFixedFile(uri);
      },
      isVisible: () => {
        return !!this.fileTreeModelService.focusedFile && !Directory.is(this.fileTreeModelService.focusedFile);
      },
    });
    commands.registerCommand<ExplorerContextCallback>(FILE_COMMANDS.OPEN_TO_THE_SIDE, {
      execute: (uri) => {
        this.fileTreeService.openToTheSide(uri);
      },
      isVisible: () => {
        return !!this.fileTreeModelService.focusedFile && !Directory.is(this.fileTreeModelService.focusedFile);
      },
    });
    commands.registerCommand<ExplorerContextCallback>(FILE_COMMANDS.COPY_PATH, {
      execute: (uri) => {
        const copyUri: URI = uri;
        let pathStr: string = decodeURIComponent(copyUri.withoutScheme().toString());
        // windows下移除路径前的 /
        if (isWindows) {
            pathStr = pathStr.slice(1);
          }
        copy(decodeURIComponent(copyUri.withoutScheme().toString()));
      },
      isVisible: () => {
        return !!this.fileTreeModelService.focusedFile;
      },
    });
    commands.registerCommand<ExplorerContextCallback>(FILE_COMMANDS.COPY_RELATIVE_PATH, {
      execute: async (uri) => {
        let rootUri: URI;
        if (this.fileTreeService.isMutiWorkspace) {
          // 多工作区额外处理
          for (const root of await this.workspaceService.roots) {
            rootUri = new URI(root.uri);
            if (rootUri.isEqualOrParent(uri)) {
              return copy(decodeURIComponent(rootUri.relative(uri)!.toString()));
            }
          }
        } else {
          if (this.workspaceService.workspace) {
            rootUri = new URI(this.workspaceService.workspace.uri);
            return copy(decodeURIComponent(rootUri.relative(uri)!.toString()));
          }
        }
      },
      isVisible: () => {
        return !!this.fileTreeModelService.focusedFile;
      },
    });
    commands.registerCommand<ExplorerContextCallback>(FILE_COMMANDS.COPY_FILE, {
      execute: (_, uris) => {
        if (uris && uris.length) {
          this.fileTreeModelService.copyFile(uris);
        } else {
          const selectedUris = this.fileTreeModelService.selectedFiles.map((file) => file.uri);
          if (selectedUris && selectedUris.length) {
            this.fileTreeModelService.copyFile(selectedUris);
          }
        }
      },
      isVisible: () => {
        return this.fileTreeModelService.selectedFiles.length >= 1;
      },
    });
    commands.registerCommand<ExplorerContextCallback>(FILE_COMMANDS.CUT_FILE, {
      execute: (_, uris) => {
        if (uris && uris.length) {
          this.fileTreeModelService.cutFile(uris);
        } else {
          const selectedUris = this.fileTreeModelService.selectedFiles.map((file) => file.uri);
          if (selectedUris && selectedUris.length) {
            this.fileTreeModelService.cutFile(selectedUris);
          }
        }
      },
      isVisible: () => {
        return this.fileTreeModelService.selectedFiles.length >= 1;
      },
    });
    commands.registerCommand<ExplorerContextCallback>(FILE_COMMANDS.PASTE_FILE, {
      execute: (uri) => {
        if (uri) {
          this.fileTreeModelService.pasteFile(uri);
        } else  if (this.fileTreeModelService.focusedFile) {
          const focusedUri = this.fileTreeModelService.focusedFile.uri;
          this.fileTreeModelService.pasteFile(focusedUri);
        }
      },
      isVisible: () => {
        return !!this.fileTreeModelService.focusedFile && Directory.is(this.fileTreeModelService.focusedFile);
      },
      isEnabled: () => {
        return this.fileTreeModelService.pasteStore && this.fileTreeModelService.pasteStore.type !== PasteTypes.NONE;
      },
    });
    commands.registerCommand(FILE_COMMANDS.OPEN_FOLDER, {
      execute: (options: {newWindow: boolean}) => {
        const dialogService: IElectronNativeDialogService = this.injector.get(IElectronNativeDialogService);
        const windowService: IWindowService = this.injector.get(IWindowService);
        dialogService.showOpenDialog({
            title: localize('workspace.open-directory'),
            properties: [
              'openDirectory',
            ],
          }).then((paths) => {
            if (paths && paths.length > 0) {
              windowService.openWorkspace(URI.file(paths[0]), options || {newWindow: true});
            }
          });
      },
    });
    commands.registerCommand(FILE_COMMANDS.FOCUS_FILES, {
      execute: () => {
        const handler = this.mainLayoutService.getTabbarHandler(ExplorerContainerId);
        if (handler) {
          handler.activate();
        }
      },
    });

    // open file
    commands.registerCommand(FILE_COMMANDS.OPEN_FILE, {
      execute: (options: IOpenDialogOptions) => {
        return this.windowDialogService.showOpenDialog(options);
      },
    });
    // save file
    commands.registerCommand(FILE_COMMANDS.SAVE_FILE, {
      execute: (options: ISaveDialogOptions) => {
        return this.windowDialogService.showSaveDialog(options);
      },
    });

    // filter in filetree
    commands.registerCommand(FILE_COMMANDS.FILTER_TOGGLE, {
      execute: () => {
        return this.fileTreeService.toggleFilterMode();
      },
    });

    commands.registerCommand(FILE_COMMANDS.FILTER_OPEN, {
      execute: () => {
        return this.fileTreeService.enableFilterMode();
      },
    });
  }

  registerKeybindings(bindings: KeybindingRegistry) {

    bindings.registerKeybinding({
      command: FILE_COMMANDS.COPY_FILE.id,
      keybinding: 'ctrlcmd+c',
      when: `${FilesExplorerFocusedContext.raw} && !${FilesExplorerInputFocusedContext.raw}`,
    });

    bindings.registerKeybinding({
      command: FILE_COMMANDS.PASTE_FILE.id,
      keybinding: 'ctrlcmd+v',
      when: `${FilesExplorerFocusedContext.raw} && !${FilesExplorerInputFocusedContext.raw} && !${FilesExplorerFilteredContext.raw}`    });

    bindings.registerKeybinding({
      command: FILE_COMMANDS.CUT_FILE.id,
      keybinding: 'ctrlcmd+x',
      when: `${FilesExplorerFocusedContext.raw} && !${FilesExplorerInputFocusedContext.raw}`});

    bindings.registerKeybinding({
      command: FILE_COMMANDS.RENAME_FILE.id,
      keybinding: 'enter',
      when: `${FilesExplorerFocusedContext.raw} && !${FilesExplorerInputFocusedContext.raw} && !${FilesExplorerFilteredContext.raw}`});

    bindings.registerKeybinding({
      command: FILE_COMMANDS.DELETE_FILE.id,
      keybinding: 'ctrlcmd+backspace',
      when: `${FilesExplorerFocusedContext.raw} && !${FilesExplorerInputFocusedContext.raw} && !${FilesExplorerFilteredContext.raw}`});

    bindings.registerKeybinding({
      command: FILE_COMMANDS.FILTER_OPEN.id,
      keybinding: 'ctrlcmd+f',
      when: `${FilesExplorerFocusedContext.raw} && !${FilesExplorerInputFocusedContext.raw}`});
  }

  registerToolbarItems(registry: ToolbarRegistry) {
    registry.registerItem({
      id: FILE_COMMANDS.NEW_FILE.id,
      command: FILE_COMMANDS.NEW_FILE.id,
      viewId: ExplorerResourceViewId,
      when: `view == '${ExplorerResourceViewId}' && !${FilesExplorerFilteredContext.raw}`,
      order: 1,
    });
    registry.registerItem({
      id: FILE_COMMANDS.NEW_FOLDER.id,
      command: FILE_COMMANDS.NEW_FOLDER.id,
      viewId: ExplorerResourceViewId,
      when: `view == '${ExplorerResourceViewId}' && !${FilesExplorerFilteredContext.raw}`,
      order: 2,
    });
    registry.registerItem({
      id: FILE_COMMANDS.FILTER_TOGGLE.id,
      command: FILE_COMMANDS.FILTER_TOGGLE.id,
      viewId: ExplorerResourceViewId,
      toggledWhen: `${FilesExplorerFilteredContext.raw}`,
      order: 3,
    });
    registry.registerItem({
      id: FILE_COMMANDS.REFRESH_ALL.id,
      command: FILE_COMMANDS.REFRESH_ALL.id,
      viewId: ExplorerResourceViewId,
      when: `view == '${ExplorerResourceViewId}' && !${FilesExplorerFilteredContext.raw}`,
      order: 4,
    });
    registry.registerItem({
      id: FILE_COMMANDS.COLLAPSE_ALL.id,
      command: FILE_COMMANDS.COLLAPSE_ALL.id,
      viewId: ExplorerResourceViewId,
      order: 5,
    });
  }

}
