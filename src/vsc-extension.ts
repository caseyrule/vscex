'use strict';
import * as vscode from 'vscode';
import { ExtensionContext, TextDocument, Uri } from 'vscode';

import { Logger, getLogger } from './logger';

export type ProjectFile = Uri;

export class VSCExtensionError extends Error {}

export abstract class VSCExtension {
  protected readonly log: Logger;

  constructor(private context: ExtensionContext, private prefix: string, name: string) {
    this.log = getLogger(name);
  }
  protected executeCommandSequence(commands: string[]): Thenable<void> {
    return VSCExtension.forEach(commands, c => vscode.commands.executeCommand(c));
  }

  public findFiles(include: string, exclude?: string): Thenable<ProjectFile[]> {
    return vscode.workspace.findFiles(include, exclude);
  }

  protected relativePath(file: Uri): string {
    return vscode.workspace.asRelativePath(file);
  }

  protected forEachFile(files: ProjectFile[], callback: (doc: TextDocument) => Thenable<boolean>): Thenable<number> {
    let count = 0;

    return VSCExtension.forEach(files, file => {
      this.log.trace(`Cleaning up ${file}`);

      return vscode.workspace
        .openTextDocument(file)
        .then(doc => callback(doc))
        .then(() => count++);
    }).then(() => count);
  }

  protected static registerMethods<T extends VSCExtension>(extension: T, methods: Array<keyof T>): void {
    methods.forEach(method => {
      extension.context.subscriptions.push(
        vscode.commands.registerCommand(`${extension.prefix}.${method}`, extension[method], extension)
      );
    });
  }

  private static forEach<T, U>(arr: T[], task: (t: T) => Thenable<U> | U): Thenable<U> {
    let thenable: Thenable<U> = Promise.resolve(null);

    for (let t of arr) {
      thenable = thenable.then(() => task(t));
    }

    return thenable;
  }
}
