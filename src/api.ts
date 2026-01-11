/**
 * @module ApiService
 * @description This module provides functionality for managing API endpoints and making HTTP requests.
 */

import { ApiError, NetworkError } from './errors';
import { Logger } from './logger';

/**
 * Represents an API endpoint with its properties.
 * @typedef {Object} ApiEndpoint
 * @property {string} id - Unique identifier for the endpoint.
 * @property {string} name - Human-readable name for the endpoint.
 * @property {string} url - The URL of the endpoint.
 * @property {string} [method='GET'] - The HTTP method for the endpoint.
 * @property {Object} [headers] - Default headers for the endpoint.
 */
interface ApiEndpoint {
  id: string;
  name: string;
  url: string;
  method: string;
  headers: Record<string, string> | undefined;
}

/**
 * Service class for managing API endpoints and making HTTP requests.
 * @class
 */
export class ApiService {
  /**
   * Map to store API endpoints.
   * @private
   * @type {Map<string, ApiEndpoint>}
   */
  private endpoints: Map<string, ApiEndpoint> = new Map();

  /**
   * Logger instance for logging API-related activities.
   * @private
   * @type {Logger}
   */
  private logger: Logger;

  /**
   * Default request timeout in milliseconds.
   * @private
   * @type {number}
   */
  private defaultTimeout: number = 30000;

  /**
   * Creates an instance of ApiService.
   * @constructor
   * @param {Logger} logger - The logger instance to use for logging API-related activities.
   * @param {number} [defaultTimeout=30000] - The default timeout for API requests in milliseconds.
   */
  constructor(logger: Logger, defaultTimeout: number = 30000) {
    this.logger = logger;
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * Adds a new API endpoint to the service.
   * @method
   * @param {string} id - Unique identifier for the endpoint.
   * @param {string} name - Human-readable name for the endpoint.
   * @param {string} url - The URL of the endpoint.
   * @param {string} [method='GET'] - The HTTP method for the endpoint.
   * @param {Object} [headers] - Default headers for the endpoint.
   * @throws {Error} If an endpoint with the same ID already exists.
   */
  addEndpoint(id: string, name: string, url: string, method: string = 'GET', headers?: Record<string, string>): void {
    if (this.endpoints.has(id)) {
      throw new Error(`Endpoint with ID '${id}' already exists.`);
    }
    this.endpoints.set(id, { id, name, url, method, headers });
    this.logger.info(`Added new endpoint: ${name} (${id})`);
  }

  /**
   * Removes an API endpoint from the service.
   * @method
   * @param {string} id - The ID of the endpoint to remove.
   * @returns {boolean} True if the endpoint was removed, false if it didn't exist.
   */
  removeEndpoint(id: string): boolean {
    const removed = this.endpoints.delete(id);
    if (removed) {
      this.logger.info(`Removed endpoint with ID: ${id}`);
    }
    return removed;
  }

  /**
   * Updates an existing API endpoint in the service.
   * @method
   * @param {string} id - The ID of the endpoint to update.
   * @param {Partial<ApiEndpoint>} updates - The properties to update.
   * @throws {Error} If the endpoint with the given ID doesn't exist.
   */
  updateEndpoint(id: string, updates: Partial<ApiEndpoint>): void {
    const endpoint = this.endpoints.get(id);
    if (!endpoint) {
      throw new Error(`Endpoint with ID '${id}' not found.`);
    }
    Object.assign(endpoint, updates);
    this.endpoints.set(id, endpoint);
    this.logger.info(`Updated endpoint: ${endpoint.name} (${id})`);
  }

  /**
   * Fetches data from a specified API endpoint.
   * @method
   * @async
   * @param {string} endpointId - The ID of the endpoint to fetch from.
   * @param {RequestInit} [options] - Optional fetch options to customize the request.
   * @returns {Promise<any>} The parsed JSON response from the API.
   * @throws {ApiError} If the endpoint is not found or the API request fails.
   * @throws {NetworkError} If there's a network-related error during the fetch operation.
   * 
   * @example
   * try {
   *   const data = await apiService.fetch('users', { method: 'GET' });
   *   console.log(data);
   * } catch (error) {
   *   console.error('Failed to fetch data:', error);
   * }
   */
  async fetch<T = any>(endpointId: string, options?: RequestInit): Promise<T> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      this.logger.error(`Endpoint not found: ${endpointId}`);
      throw new ApiError(404, `Endpoint not found: ${endpointId}`);
    }

    try {
      this.logger.info(`Fetching from endpoint: ${endpoint.name}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout);

      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: { ...endpoint.headers, ...options?.headers },
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        this.logger.error(`API request failed: ${response.statusText}`, { status: response.status });
        throw new ApiError(response.status, `API request failed: ${response.statusText}`);
      }
      const data = await response.json();
      this.logger.info(`Successfully fetched data from ${endpoint.name}`);
      return data as T;
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof DOMException && error.name === 'AbortError') {
        const timeoutError = new NetworkError(`Request timeout for ${endpoint.name}`, 'Request timed out');
        this.logger.error(timeoutError.message, { endpointName: endpoint.name });
        throw timeoutError;
      }
      const networkError = new NetworkError(
        `Network error while fetching ${endpoint.name}`,
        error instanceof Error ? error.message : String(error)
      );
      this.logger.error(networkError.message, { endpointName: endpoint.name });
      throw networkError;
    }
  }

  /**
   * Performs a GET request to the specified endpoint.
   * @method
   * @async
   * @param {string} endpointId - The ID of the endpoint to fetch from.
   * @param {RequestInit} [options] - Optional fetch options to customize the request.
   * @returns {Promise<any>} The parsed JSON response from the API.
   */
  async get<T = any>(endpointId: string, options?: RequestInit): Promise<T> {
    return this.fetch<T>(endpointId, { ...options, method: 'GET' });
  }

  /**
   * Performs a POST request to the specified endpoint.
   * @method
   * @async
   * @param {string} endpointId - The ID of the endpoint to post to.
   * @param {any} body - The body of the POST request.
   * @param {RequestInit} [options] - Optional fetch options to customize the request.
   * @returns {Promise<any>} The parsed JSON response from the API.
   */
  async post<TResponse = any, TBody = any>(endpointId: string, body: TBody, options?: RequestInit): Promise<TResponse> {
    return this.fetch<TResponse>(endpointId, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  }

  /**
   * Performs a PUT request to the specified endpoint.
   * @method
   * @async
   * @param {string} endpointId - The ID of the endpoint to put to.
   * @param {any} body - The body of the PUT request.
   * @param {RequestInit} [options] - Optional fetch options to customize the request.
   * @returns {Promise<any>} The parsed JSON response from the API.
   */
  async put<TResponse = any, TBody = any>(endpointId: string, body: TBody, options?: RequestInit): Promise<TResponse> {
    return this.fetch<TResponse>(endpointId, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  }

  /**
   * Performs a DELETE request to the specified endpoint.
   * @method
   * @async
   * @param {string} endpointId - The ID of the endpoint to delete from.
   * @param {RequestInit} [options] - Optional fetch options to customize the request.
   * @returns {Promise<any>} The parsed JSON response from the API.
   */
  async delete<T = any>(endpointId: string, options?: RequestInit): Promise<T> {
    return this.fetch<T>(endpointId, { ...options, method: 'DELETE' });
  }
}