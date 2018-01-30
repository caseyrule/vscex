import {
  AbstractLogger,
  LFService,
  LogFormat,
  Logger as TSLogger,
  LoggerFactoryOptions,
  LoggerType,
  LogGroupRule,
  LogLevel,
  LogMessage,
  JSONHelper
} from 'typescript-logging';
import * as vscode from 'vscode';

import { LogGroupRuntimeSettings } from '../node_modules/typescript-logging/dist/commonjs/log/standard/LoggerFactoryService';

export interface Logger extends TSLogger {
  inspect(val: any, space?: string | number): void;
}

function toJson(val, maxDepth: number = 10, depth: number = 0, encountered: any[] = []): any {
  try {
    switch (typeof val) {
      case 'object':
        if (depth > maxDepth) {
          return '[[ object (max depth exceeded) ]]';
        } else if (val === null) {
          return null;
        } else if (encountered.indexOf(val) >= 0) {
          return '[[ object ]]';
        } else {
          if (val instanceof Array) {
            const newArr = [];

            encountered.push(val);

            for (let v of val) {
              newArr.push(toJson(v, maxDepth, depth + 1, encountered));
            }

            return newArr;
          } else {
            const newObj = {};

            encountered.push(val);

            for (let k of Object.keys(val)) {
              newObj[k] = toJson(val[k], maxDepth, depth + 1, encountered);
            }

            return newObj;
          }
        }
      case 'string':
      case 'number':
      case 'boolean':
        return val;
      default:
        return `[[ ${typeof val} ]]`;
    }
  } catch (e) {
    return { error: '' + e };
  }
}

class VSLogger extends AbstractLogger implements Logger {
  private static instances: { [K in string]: Logger } = {};
  private outputChannel: vscode.OutputChannel;

  private constructor(name: string, settings: LogGroupRuntimeSettings) {
    super(name, settings);
    this.outputChannel = vscode.window.createOutputChannel(name);
    this.outputChannel.show();
    console.log();
  }

  protected doLog(msg: LogMessage): void {
    this.outputChannel.appendLine(this.createDefaultLogMessage(msg));
  }

  public inspect(val: any, space: string | number = 2): void {
    try {
      const arr: string[] = [];

      for (const arg of arguments) {
        arr.push(JSON.stringify(toJson(arg), null, space));
      }

      this.debug(arr.join(', '));
    } catch (e) {
      this.debug('Snapshot failed: ', e);
    }
  }

  public static get(name: string): Logger {
    let logger: Logger = VSLogger.instances[name];

    if (logger) {
      return logger;
    }

    return (VSLogger.instances[name] = <Logger>LFService.createNamedLoggerFactory(
      'LoggerFactory',
      new LoggerFactoryOptions().addLogGroupRule(
        new LogGroupRule(
          new RegExp('.+'),
          LogLevel.Trace,
          new LogFormat(),
          LoggerType.Custom,
          (loggerName, settings) => new VSLogger(loggerName, settings)
        )
      )
    ).getLogger(name));
  }
}

export function getLogger(name: string): Logger {
  return VSLogger.get(name);
}
