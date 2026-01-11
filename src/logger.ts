/**
 * @module Logger
 * @description This module provides a comprehensive logging utility class that uses Winston as the underlying logging library.
 */

import { createLogger, format, transports } from 'winston';
import * as path from 'path';
import * as fs from 'fs';
import { LogDirectoryNotFoundError } from './errors';

/**
 * A comprehensive logging utility class that provides various logging functionalities.
 * It uses Winston as the underlying logging library and supports multiple log levels, custom formatting,
 * file and console transports, and dynamic configuration.
 * 
 * @class
 */
export class Logger {
    /**
     * The Winston logger instance
     * @private
     * @type {import('winston').Logger}
     */
    private logger: any;

    /**
     * The full path to the log file
     * @private
     * @type {string}
     */
    private logFilePath: string;

    /**
     * The format string for log messages
     * @private
     * @type {string}
     * @default '[{level}] - [{timestamp}]{context} {message}'
     */
    private logFormat: string = '[{level}] - [{timestamp}]{context} {message}';

    /**
     * The name of the log file
     * @private
     * @type {string}
     * @default 'combined.log'
     */
    private logFileName: string = 'combined.log';

    /**
     * Creates an instance of Logger.
     * @constructor
     * @param {string} [context] - The context string to be included in log messages. This helps in identifying the source of the log entry.
     * @param {string} [logFilePath='logs/combined.log'] - The default path for the log file. Can be absolute or relative.
     * @param {Object} [options] - Additional options for configuring the logger
     * @param {boolean} [options.recursive] - Whether to create parent directories recursively for the log file path
     * 
     * @example
     * // Create a logger with default settings
     * const logger = new Logger();
     * 
     * @example
     * // Create a logger with custom context and log file path
     * const logger = new Logger('MyApp', '/var/log/myapp.log', { recursive: true });
     */
    constructor(
        private context?: string, 
        logFilePath: string = 'logs/combined.log',
        options?: { 
        /**
         * If true, creates all necessary parent directories.
         * If false or not provided, throws an error if the immediate parent directory doesn't exist.
         */
        recursive?: boolean }
    ) {
        this.logFilePath = logFilePath;
        this.setLogFilePath(this.logFilePath, options);
    }

    /**
     * @method setLogFilePath
     * @description Sets the log file path and creates the directory if it doesn't exist.
     * This method updates the log file path and ensures that the directory structure
     * for the log file exists. If the directory doesn't exist, it can optionally create
     * it based on the provided options.
     * 
     * @param {string} filePath - The new file path for the log file. This should be an
     * absolute or relative path to where you want the log file to be created.
     * 
     * @param {Object} [options] - Additional options for configuring the log file path.
     * @param {boolean} [options.recursive] - Whether to create parent directories recursively.
     * If set to true, it will create all necessary parent directories. If false or not provided,
     * it will throw an error if the immediate parent directory doesn't exist.
     * 
     * @throws {Error} If the log directory doesn't exist and the recursive option is not set to true.
     * This error helps prevent unintended creation of directories.
     * 
     * @example
     * // Set log file path with recursive directory creation
     * logger.setLogFilePath('/var/log/myapp/app.log', { recursive: true });
     * 
     * @example
     * // Set log file path without recursive creation (immediate parent must exist)
     * logger.setLogFilePath('./logs/app.log');
     */
    public setLogFilePath(filePath: string, options?: { 
        /**
         * If true, creates all necessary parent directories.
         * If false or not provided, throws an error if the immediate parent directory doesn't exist.
         */
        recursive?: boolean }): void {
        this.logFilePath = filePath;
        const dir = path.dirname(this.logFilePath);

        if (!fs.existsSync(dir)) {
            if (options?.recursive) {
                fs.mkdirSync(dir, { recursive: true });
            } else {
                throw new LogDirectoryNotFoundError(`Log directory does not exist: ${dir}`, dir);
            }
        }

        this.initLogger();
    }

    /**
     * @method setLogFileName
     * @description Sets the log file name and updates the log file path
     * @param {string} fileName - The new file name for the log file
     */
    public setLogFileName(fileName: string): void {
        this.logFileName = fileName;
        this.logFilePath = path.join(path.dirname(this.logFilePath), this.logFileName);
        this.initLogger();
    }

    /**
     * @method setLogFormat
     * @description Sets the format string for log messages
     * @param {string} format - The new format string
     */
    public setLogFormat(format: string): void {
        this.logFormat = format;
        this.initLogger();
    }

    /**
     * @private
     * @method initLogger
     * @description Initializes the Winston logger with the current configuration
     */
    private initLogger(): void {
        const customFormat = format.printf(({ level, message, timestamp, ...metadata }) => {
            let msg = this.logFormat
                .replace('{level}', level ? level.toUpperCase() : '')
                .replace('{timestamp}', timestamp || '')
                .replace('{context}', this.context ? ` - [${this.context}]` : '')
                .replace('{message}', message);

            if (Object.keys(metadata).length > 0) {
                msg += ` ${JSON.stringify(metadata)}`;
            }

            return msg;
        });

        this.logger = createLogger({
            level: 'info',
            format: format.combine(
                format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                format.errors({ stack: true }),
                format.splat(),
                customFormat
            ),
            defaultMeta: { service: 'user-service' },
            transports: [
                new transports.File({ filename: path.join(path.dirname(this.logFilePath), 'error.log'), level: 'error' }),
                new transports.File({ filename: this.logFilePath })
            ]
        });

        if (process.env['NODE_ENV'] !== 'production') {
            this.logger.add(new transports.Console({
                format: format.combine(
                    format.colorize(),
                    customFormat
                )
            }));
        }
    }

    /**
     * @method info
     * @description Logs an info level message
     * @param {string} message - The message to log
     * @param {Object} [meta] - Additional metadata to include in the log
     */
    public info(message: string, meta?: Object): void {
        this.logWithLevel('info', message, meta);
    }

    /**
     * @method warn
     * @description Logs a warn level message
     * @param {string} message - The message to log
     * @param {Object} [meta] - Additional metadata to include in the log
     */
    public warn(message: string, meta?: Object): void {
        this.logWithLevel('warn', message, meta);
    }

    /**
     * @method error
     * @description Logs an error level message
     * @param {string} message - The message to log
     * @param {Object} [meta] - Additional metadata to include in the log
     */
    public error(message: string, meta?: Object): void {
        this.logWithLevel('error', message, meta);
    }

    /**
     * @method debug
     * @description Logs a debug level message
     * @param {string} message - The message to log
     * @param {Object} [meta] - Additional metadata to include in the log
     */
    public debug(message: string, meta?: Object): void {
        this.logWithLevel('debug', message, meta);
    }

    /**
     * @method verbose
     * @description Logs a verbose level message
     * @param {string} message - The message to log
     * @param {Object} [meta] - Additional metadata to include in the log
     */
    public verbose(message: string, meta?: Object): void {
        this.logWithLevel('verbose', message, meta);
    }

    /**
     * @private
     * @method logWithLevel
     * @description Internal method to log messages with a specific level
     * @param {string} level - The log level
     * @param {string} message - The message to log
     * @param {Object} [meta] - Additional metadata to include in the log
     */
    private logWithLevel(level: string, message: string, meta?: Object): void {
        this.logger.log({
            level,
            message,
            ...meta
        });
    }

    /**
     * @method logWithoutDetails
     * @description Logs a message without timestamp details
     * @param {string} message - The message to log
     * @param {Object} [meta] - Additional metadata to include in the log
     */
    public logWithoutDetails(message: string, meta?: Object): void {
        this.logger.log({
            level: 'info',
            message,
            ...meta,
            timestamp: false
        });
    }

    /**
     * @method log
     * @description Flexible logging method with customizable options
     * @param {string} message - The message to log
     * @param {Object} [options] - Logging options
     * @param {string} [options.level] - The log level
     * @param {boolean} [options.timestamp] - Whether to include a timestamp
     * @param {Object} [options.meta] - Additional metadata to include in the log
     */
    public log(message: string, options?: { level?: string; timestamp?: boolean; meta?: Object }): void {
        const { level, timestamp, meta = {} } = options || {};
        this.logger.log({
            level,
            message,
            ...meta,
            timestamp: timestamp === undefined ? undefined : (timestamp ? undefined : false)
        });
    }

    /**
     * @method setLogLevel
     * @description Sets the minimum log level for the logger
     * @param {string} level - The new minimum log level
     */
    public setLogLevel(level: string): void {
        this.logger.level = level;
    }

    /**
     * @method addTransport
     * @description Adds a new transport to the logger
     * @param {any} transport - The transport to add
     */
    public addTransport(transport: any): void {
        this.logger.add(transport);
    }

    /**
     * @method removeTransport
     * @description Removes a transport from the logger
     * @param {any} transport - The transport to remove
     */
    public removeTransport(transport: any): void {
        this.logger.remove(transport);
    }
}