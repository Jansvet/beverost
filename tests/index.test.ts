import { expect } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs';
import {
  Logger,
  CustomError,
  ApiError,
  NetworkError,
  ParseError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  DatabaseError,
  ConfigurationError,
  ExternalServiceError,
  FileNotFoundError,
  LogDirectoryNotFoundError,
  LogFileOperationError,
  LoggerInitializationError
} from '../src/index';
import { transports } from 'winston';
import { ApiService } from '../src/api';

describe('Logger', () => {
  let logger: Logger;
  const testLogDir = path.join(__dirname, 'test_logs');
  const testLogFile = path.join(testLogDir, 'test.log');

  beforeEach(async () => {
    logger = new Logger('TestContext', testLogFile, { recursive: true });
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for file creation
  });

afterEach(async () => {
    if (logger && (logger as any).logger) {
        (logger as any).logger.close();
    }
    await new Promise(resolve => setTimeout(resolve, 50));
    if (fs.existsSync(testLogFile)) {
      await fs.promises.unlink(testLogFile);
    }
    if (fs.existsSync(testLogDir)) {
      await fs.promises.rm(testLogDir, { recursive: true, force: true });
    }
  });

  it('should create a log file with recursive option', async () => {
    await logger.info('Test log message');
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for file write
    expect(fs.existsSync(testLogFile)).toBe(true);
  });

  it('should set log file path with recursive option', async () => {
    const newLogFile = path.join(testLogDir, 'subdir', 'new.log');
    await logger.setLogFilePath(newLogFile, { recursive: true });
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for directory creation
    await expect(fs.existsSync(path.dirname(newLogFile))).toBe(true);
  });

  it('should throw LogDirectoryNotFoundError when setting log file path without recursive option', async () => {
    const newLogFile = path.join(testLogDir, 'nonexistent', 'new.log');
    
    try {
        await logger.setLogFilePath(newLogFile);
        // If it doesn't throw, we force a failure
        fail('Should have thrown an error');
    } catch (error) {
        expect(error).toBeInstanceOf(LogDirectoryNotFoundError);
        expect((error as any).message).toContain('Log directory does not exist');
    }
  });

  it('should log messages with different levels', async () => {
    logger.setLogLevel('debug');
    await logger.info('Info message');
    await logger.warn('Warning message');
    await logger.error('Error message');
    await logger.debug('Debug message');
    await logger.verbose('Verbose message');
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for file write

    const logContent = await fs.promises.readFile(testLogFile, 'utf8');
    expect(logContent).toContain('INFO');
    expect(logContent).toContain('WARN');
    expect(logContent).toContain('ERROR');
    expect(logContent).toContain('DEBUG');
    expect(logContent).toContain('VERBOSE');
  });

  it('should include context in log messages', async () => {
    await logger.info('Context test');
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for file write
    const logContent = await fs.promises.readFile(testLogFile, 'utf8');
    expect(logContent).toContain('[TestContext]');
  });

  it('should handle log without details', async () => {
    await logger.logWithoutDetails('No details log');
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for file write
    const logContent = await fs.promises.readFile(testLogFile, 'utf8');
    expect(logContent).toContain('No details log');
    expect(logContent).not.toContain('timestamp');
  });

  it('should allow setting log level', async () => {
    logger.setLogLevel('error');
    await logger.info('This should not be logged');
    await logger.error('This should be logged');
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for file write
    const logContent = await fs.promises.readFile(testLogFile, 'utf8');
    expect(logContent).not.toContain('This should not be logged');
    expect(logContent).toContain('This should be logged');
  });

  it('should add and remove transports', () => {
    const consoleTransport = new transports.Console();
    logger.addTransport(consoleTransport);
    expect(logger['logger'].transports).toContain(consoleTransport);
    logger.removeTransport(consoleTransport);
    expect(logger['logger'].transports).not.toContain(consoleTransport);
  });

  it('should set log format', async () => {
    logger.setLogFormat('{level}: {message}');
    await logger.info('Custom format test');
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for file write
    const logContent = await fs.promises.readFile(testLogFile, 'utf8');
    expect(logContent).toMatch(/INFO: Custom format test/);
  });

  it('should set log file name', async () => {
    const newFileName = 'new_log_file.log';
    logger.setLogFileName(newFileName);
    await logger.info('New file name test');
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for file write
    const newFilePath = path.join(path.dirname(testLogFile), newFileName);
    expect(fs.existsSync(newFilePath)).toBe(true);
  });
});

describe('CustomError', () => {
  const mockLogger = { error: jest.fn() };

  it('should create and log CustomError correctly', () => {
    const customError = new (class extends CustomError {
      log(logger: any): void {
        logger.error(`Custom Error: ${this.name} - ${this.message}`);
      }
    })('CustomErrorName', 'This is a custom error message');

    customError.log(mockLogger);

    expect(mockLogger.error).toHaveBeenCalledWith('Custom Error: CustomErrorName - This is a custom error message');
  });

  it('should create and log ApiError correctly', () => {
    const error = new ApiError(404, 'Not Found', 'REQ123');
    expect(error.name).toBe('ApiError');
    expect(error.message).toBe('Not Found');
    expect(error.status).toBe(404);
    expect(error.requestId).toBe('REQ123');
    error.log(mockLogger);
    expect(mockLogger.error).toHaveBeenCalledWith('API Error 404: Not Found (Request ID: REQ123)');
  });

  it('should create and log NetworkError correctly', () => {
    const error = new NetworkError('Connection failed', 'TIMEOUT');
    expect(error.name).toBe('NetworkError');
    expect(error.message).toBe('Connection failed');
    expect(error.code).toBe('TIMEOUT');
    error.log(mockLogger);
    expect(mockLogger.error).toHaveBeenCalledWith('Network Error (TIMEOUT): Connection failed');
  });

  it('should create and log ParseError correctly', () => {
    const error = new ParseError('Invalid JSON', 'config.json');
    expect(error.name).toBe('ParseError');
    expect(error.message).toBe('Invalid JSON');
    expect(error.source).toBe('config.json');
    error.log(mockLogger);
    expect(mockLogger.error).toHaveBeenCalledWith('Parse Error in config.json: Invalid JSON');
  });

  it('should create and log ValidationError correctly', () => {
    const error = new ValidationError('Invalid input', ['username', 'email']);
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Invalid input');
    expect(error.fields).toEqual(['username', 'email']);
    error.log(mockLogger);
    expect(mockLogger.error).toHaveBeenCalledWith('Validation Error: Invalid input (Fields: username, email)');
  });

  it('should create and log AuthenticationError correctly', () => {
    const error = new AuthenticationError('Invalid credentials', 'user123');
    expect(error.name).toBe('AuthenticationError');
    expect(error.message).toBe('Invalid credentials');
    expect(error.userId).toBe('user123');
    error.log(mockLogger);
    expect(mockLogger.error).toHaveBeenCalledWith('Authentication Error: Invalid credentials (User ID: user123)');
  });

  it('should create and log AuthorizationError correctly', () => {
    const error = new AuthorizationError('Insufficient permissions', 'admin_panel', 'delete');
    expect(error.name).toBe('AuthorizationError');
    expect(error.message).toBe('Insufficient permissions');
    expect(error.resource).toBe('admin_panel');
    expect(error.action).toBe('delete');
    error.log(mockLogger);
    expect(mockLogger.error).toHaveBeenCalledWith('Authorization Error: Insufficient permissions (Resource: admin_panel) (Action: delete)');
  });

  it('should create and log RateLimitError correctly', () => {
    const error = new RateLimitError('Too many requests', 60);
    expect(error.name).toBe('RateLimitError');
    expect(error.message).toBe('Too many requests');
    expect(error.retryAfter).toBe(60);
    error.log(mockLogger);
    expect(mockLogger.error).toHaveBeenCalledWith('Rate Limit Error: Too many requests (Retry After: 60s)');
  });

  it('should create and log DatabaseError correctly', () => {
    const error = new DatabaseError('Query failed', 'INSERT');
    expect(error.name).toBe('DatabaseError');
    expect(error.message).toBe('Query failed');
    expect(error.operation).toBe('INSERT');
    error.log(mockLogger);
    expect(mockLogger.error).toHaveBeenCalledWith('Database Error: Query failed (Operation: INSERT)');
  });

  it('should create and log ConfigurationError correctly', () => {
    const error = new ConfigurationError('Invalid configuration', 'API_KEY');
    expect(error.name).toBe('ConfigurationError');
    expect(error.message).toBe('Invalid configuration');
    expect(error.configKey).toBe('API_KEY');
    error.log(mockLogger);
    expect(mockLogger.error).toHaveBeenCalledWith('Configuration Error: Invalid configuration (Config Key: API_KEY)');
  });

  it('should create and log ExternalServiceError correctly', () => {
    const error = new ExternalServiceError('External service unavailable', 'PaymentGateway');
    expect(error.name).toBe('ExternalServiceError');
    expect(error.message).toBe('External service unavailable');
    expect(error.serviceName).toBe('PaymentGateway');
    error.log(mockLogger);
    expect(mockLogger.error).toHaveBeenCalledWith('External Service Error (PaymentGateway): External service unavailable');
  });

  it('should create and log FileNotFoundError correctly', () => {
    const error = new FileNotFoundError('File not found', '/path/to/config.json');
    expect(error.name).toBe('FileNotFoundError');
    expect(error.message).toBe('File not found');
    expect(error.path).toBe('/path/to/config.json');
    error.log(mockLogger);
    expect(mockLogger.error).toHaveBeenCalledWith('File Not Found Error: File not found (Path: /path/to/config.json)');
  });

  it('should create and log LogDirectoryNotFoundError correctly', () => {
    const error = new LogDirectoryNotFoundError('Log directory not found', '/var/log/app');
    expect(error.name).toBe('LogDirectoryNotFoundError');
    expect(error.message).toBe('Log directory not found');
    expect(error.directoryPath).toBe('/var/log/app');
    error.log(mockLogger);
    expect(mockLogger.error).toHaveBeenCalledWith('Log Directory Not Found Error: Log directory not found (Directory: /var/log/app)');
  });

  it('should create and log LogFileOperationError correctly', () => {
    const error = new LogFileOperationError('Failed to write to log file', '/var/log/app/error.log', 'write');
    expect(error.name).toBe('LogFileOperationError');
    expect(error.message).toBe('Failed to write to log file');
    expect(error.filePath).toBe('/var/log/app/error.log');
    expect(error.operation).toBe('write');
    error.log(mockLogger);
    expect(mockLogger.error).toHaveBeenCalledWith('Log File Operation Error: Failed to write to log file (File: /var/log/app/error.log, Operation: write)');
  });

  it('should create and log LoggerInitializationError correctly', () => {
    const error = new LoggerInitializationError('Failed to initialize logger', 'FileTransport');
    expect(error.name).toBe('LoggerInitializationError');
    expect(error.message).toBe('Failed to initialize logger');
    expect(error.component).toBe('FileTransport');
    error.log(mockLogger);
    expect(mockLogger.error).toHaveBeenCalledWith('Logger Initialization Error: Failed to initialize logger (Component: FileTransport)');
  });

  it('should log errors after throwing', () => {
    try {
      throw new DatabaseError('Query failed', 'INSERT');
    } catch (error) {
      if (error instanceof DatabaseError) {
        error.log(mockLogger);
        expect(mockLogger.error).toHaveBeenCalledWith('Database Error: Query failed (Operation: INSERT)');
      }
    }
  });
});

describe('ApiService', () => {
  let apiService: ApiService;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    };
    apiService = new ApiService(mockLogger as any);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should add an endpoint and throw on duplicate', () => {
    apiService.addEndpoint('test', 'Test Endpoint', 'https://api.example.com/test');
    expect(() => apiService.addEndpoint('test', 'Duplicate', 'https://api.example.com/duplicate'))
      .toThrow("Endpoint with ID 'test' already exists.");
    expect(mockLogger.info).toHaveBeenCalledWith('Added new endpoint: Test Endpoint (test)');
  });

  it('should remove an endpoint', () => {
    apiService.addEndpoint('test', 'Test Endpoint', 'https://api.example.com/test');
    expect(apiService.removeEndpoint('test')).toBe(true);
    expect(apiService.removeEndpoint('nonexistent')).toBe(false);
    expect(mockLogger.info).toHaveBeenCalledWith('Removed endpoint with ID: test');
  });

  it('should update an endpoint', () => {
    apiService.addEndpoint('test', 'Test Endpoint', 'https://api.example.com/test');
    apiService.updateEndpoint('test', { name: 'Updated Test Endpoint', url: 'https://api.example.com/updated' });
    expect(() => apiService.updateEndpoint('nonexistent', {})).toThrow("Endpoint with ID 'nonexistent' not found.");
    expect(mockLogger.info).toHaveBeenCalledWith('Updated endpoint: Updated Test Endpoint (test)');
  });

  it('should fetch data from an endpoint', async () => {
    apiService.addEndpoint('test', 'Test Endpoint', 'https://api.example.com/test');
    const mockResponse = { data: 'test' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockResponse),
    });

    const result = await apiService.fetch('test');
    expect(result).toEqual(mockResponse);
    expect(mockLogger.info).toHaveBeenCalledWith('Fetching from endpoint: Test Endpoint');
    expect(mockLogger.info).toHaveBeenCalledWith('Successfully fetched data from Test Endpoint');
  });

  it('should throw ApiError on non-OK response', async () => {
    apiService.addEndpoint('test', 'Test Endpoint', 'https://api.example.com/test');
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(apiService.fetch('test')).rejects.toThrow(ApiError);
    expect(mockLogger.error).toHaveBeenCalledWith('API request failed: Not Found', { status: 404 });
  });

  it('should throw NetworkError on fetch failure', async () => {
    apiService.addEndpoint('test', 'Test Endpoint', 'https://api.example.com/test');
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failure'));

    await expect(apiService.fetch('test')).rejects.toThrow(NetworkError);
    expect(mockLogger.error).toHaveBeenCalledWith('Network error while fetching Test Endpoint', { endpointName: 'Test Endpoint' });
  });

  it('should perform GET request', async () => {
    apiService.addEndpoint('test', 'Test Endpoint', 'https://api.example.com/test');
    const mockResponse = { data: 'test' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockResponse),
    });

    const result = await apiService.get('test');
    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/test', expect.objectContaining({ method: 'GET' }));
  });

  it('should perform POST request', async () => {
    apiService.addEndpoint('test', 'Test Endpoint', 'https://api.example.com/test');
    const mockResponse = { data: 'test' };
    const postData = { key: 'value' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockResponse),
    });

    const result = await apiService.post('test', postData);
    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/test', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(postData),
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }));
  });

  it('should perform PUT request', async () => {
    apiService.addEndpoint('test', 'Test Endpoint', 'https://api.example.com/test');
    const mockResponse = { data: 'test' };
    const putData = { key: 'value' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockResponse),
    });

    const result = await apiService.put('test', putData);
    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/test', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify(putData),
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }));
  });

  it('should perform DELETE request', async () => {
    apiService.addEndpoint('test', 'Test Endpoint', 'https://api.example.com/test');
    const mockResponse = { data: 'test' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockResponse),
    });

    const result = await apiService.delete('test');
    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/test', expect.objectContaining({ method: 'DELETE' }));
  });
});