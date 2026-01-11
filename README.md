# Beverost

Better server boost for server development in Node.js

Beverost is a comprehensive toolkit designed to enhance server-side development in Node.js. It provides a set of utilities, including custom error classes and a flexible logging system, to streamline the development process and improve error handling and logging capabilities in your Node.js applications.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Features](#features)
- [API Reference](#api-reference)
  - [Logger](#logger)
  - [Error Classes](#error-classes)
- [Advanced Usage](#advanced-usage)
  - [Customizing Log Formats](#customizing-log-formats)
  - [Adding Custom Transports](#adding-custom-transports)
  - [Error Handling with Custom Errors](#error-handling-with-custom-errors)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)
- [Acknowledgements](#acknowledgements)

## Installation

To install Beverost, run the following command in your project directory:

```bash
npm install Jansvet/beverost
```

## Usage

Here's a basic example of how to use Beverost in your Node.js application:

```javascript
// ES Modules (ESM)
import { Logger, ApiError, NetworkError } from 'beverost';

// CommonJS
// const { Logger, ApiError, NetworkError } = require('beverost');

// Create a logger instance
const logger = new Logger('MyApp');

// Log messages
logger.info('Application started');

// Use custom error classes
try {
  // Some code that might throw an error
  throw new ApiError(404, 'Resource not found');
} catch (error) {
  if (error instanceof ApiError) {
    logger.error(`API Error: ${error.message}`, { statusCode: error.statusCode });
  } else if (error instanceof NetworkError) {
    logger.error(`Network Error: ${error.message}`, { details: error.details });
  } else {
    logger.error('An unexpected error occurred', { error });
  }
}
```

## Features

- **Custom error classes**: Beverost provides a set of pre-defined error classes for common scenarios in server-side development, making it easier to handle and categorize errors.
- **Flexible logging system**: Built on top of Winston, Beverost's logging system allows for easy configuration and extensibility.
- **TypeScript support**: Full TypeScript support with type definitions included.
- **JavaScript support**: Compatible with various JavaScript environments and module systems (ESM, CommonJS, etc.).
- **Consistent error handling**: Standardized approach to error handling across your application.
- **Configurable log formats**: Customize log formats to suit your needs.
- **Multiple log levels**: Support for various log levels (info, warn, error, debug, verbose).
- **File logging**: Easy setup for logging to files, with options for log rotation.
- **Performance optimization**: Efficient logging and error handling to minimize overhead.
- **Extensibility**: Easy to extend with custom error classes and log transports.

## API Reference

### Logger

The `Logger` class provides a wrapper around Winston for consistent logging across your application.

```typescript
const logger = new Logger(context?: string, logFilePath?: string);
```

#### Constructor Parameters

- `context` (optional): A string that identifies the context of the logger (e.g., module name, class name).
- `logFilePath` (optional): The file path where log files should be stored.

#### Methods

- `info(message: string, meta?: Object): void`: Log an informational message.
- `warn(message: string, meta?: Object): void`: Log a warning message.
- `error(message: string, meta?: Object): void`: Log an error message.
- `debug(message: string, meta?: Object): void`: Log a debug message.
- `verbose(message: string, meta?: Object): void`: Log a verbose message.
- `setLogFilePath(filePath: string, recursive?: boolean): void`: Set the file path for log files.
- `setLogFileName(fileName: string): void`: Set the name of the log file.
- `setLogFormat(format: string): void`: Set the format for log messages.
- `setLogLevel(level: string): void`: Set the minimum log level to be recorded.
- `addTransport(transport: any): void`: Add a custom Winston transport.
- `removeTransport(transport: any): void`: Remove a Winston transport.

### Error Classes

Beverost provides the following custom error classes:

- `ApiError`: For API-related errors, includes a status code.
- `NetworkError`: For network-related issues, includes details about the connection.
- `ParseError`: For errors that occur during parsing operations.
- `ValidationError`: For data validation errors, includes validation details.
- `AuthenticationError`: For authentication failures.
- `AuthorizationError`: For authorization issues.
- `RateLimitError`: For rate limiting scenarios.
- `DatabaseError`: For database-related errors.
- `ConfigurationError`: For configuration-related issues.
- `ExternalServiceError`: For errors related to external service calls.

Each error class extends from a base `BaseError` class and provides specific properties and logging behavior. Here's an example of using the `ApiError` class:

```typescript
throw new ApiError(404, 'Resource not found', { resourceId: '123' });
```

## Advanced Usage

### Customizing Log Formats

You can customize the log format using the `setLogFormat` method:

```typescript
const logger = new Logger('MyApp');
logger.setLogFormat('${timestamp} [${level}] ${message}');
```

### Adding Custom Transports

Beverost allows you to add custom Winston transports:

```javascript
import { transports } from 'winston';
// For CommonJS: const { transports } = require('winston');

const logger = new Logger('MyApp');
const consoleTransport = new transports.Console({ level: 'debug' });
logger.addTransport(consoleTransport);
```

### Error Handling with Custom Errors

Leveraging custom error classes for more detailed error handling:

```javascript
try {
  // Some database operation
  throw new DatabaseError('Connection failed', { dbName: 'users', errorCode: 'ECONNREFUSED' });
} catch (error) {
  if (error instanceof DatabaseError) {
    logger.error(`Database Error: ${error.message}`, { details: error.details });
    // Perform specific actions for database errors
  } else {
    logger.error('An unexpected error occurred', { error });
  }
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. Here are some ways you can contribute:

1. Report bugs and suggest features by opening issues.
2. Submit pull requests with bug fixes or new features.
3. Improve documentation or add examples.
4. Write tests to increase code coverage.
5. Optimize performance and suggest improvements.

Before submitting a pull request, please ensure that your code adheres to the existing style, passes all tests, and includes appropriate documentation.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please file an issue on the GitHub repository. For commercial support, custom development, or training, please contact the maintainers directly.

## Acknowledgements

Beverost is built on top of several open-source projects, including Winston for logging. We're grateful to the maintainers and contributors of these projects for their work. Special thanks to our community of users and contributors who help make Beverost better with each release.
