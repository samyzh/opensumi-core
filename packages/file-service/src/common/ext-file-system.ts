import * as vscode from 'vscode';
import { Event, Disposable } from '@ali/ide-core-common';
import { FileChange } from './file-service-watcher-protocol';

export interface IMainThreadFileSystem {
  $subscribeWatcher(options: ExtFileSystemWatcherOptions): number;
  $unsubscribeWatcher(id: number);

  stat(uri);
}

export interface IExtHostFileSystem {
  onDidChange: Event<ExtFileChangeEventInfo>;
  $onFileEvent(options: ExtFileChangeEventInfo);

  subscribeWatcher(options: ExtFileSystemWatcherOptions): Promise<number>;
  unsubscribeWatcher(id: number): Promise<void>;

  registerFileSystemProvider(
    scheme: string,
    provider: vscode.FileSystemProvider,
    options: { isCaseSensitive?: boolean, isReadonly?: boolean },
  ): Disposable;

  $stat(uri);
}

export interface ExtFileChangeEventInfo {
  id: number;
  event: FileChange;
}

export interface ExtFileSystemWatcherOptions {
  globPattern: vscode.GlobPattern;
  ignoreCreateEvents: boolean;
  ignoreChangeEvents: boolean;
  ignoreDeleteEvents: boolean;
}

export type ParsedPattern = (path: string, basename?: string) => boolean;

export interface ExtFileWatcherSubscriber {
  id: number;
  mather: ParsedPattern;
  ignoreCreateEvents: boolean;
  ignoreChangeEvents: boolean;
  ignoreDeleteEvents: boolean;
}
