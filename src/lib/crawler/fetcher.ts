/**
 * HTTP Fetcher
 * Safe fetcher with timeouts, size limits, and SSRF protection
 */

import { validateUrl } from '@/lib/security/url-validator';

export interface FetchResult {
  url: string;
  finalUrl: string;
  statusCode: number;
  contentType: string;
  html: string;
  responseSize: number;
  loadTime: number;
  redirectChain: string[];
  error?: string;
}

export interface FetchOptions {
  timeout?: number;        // ms, default 15000
  maxResponseSize?: number; // bytes, default 5MB
  maxRedirects?: number;    // default 5
  userAgent?: string;
}

const DEFAULT_OPTIONS: Required<FetchOptions> = {
  timeout: 15000,
  maxResponseSize: 5 * 1024 * 1024, // 5MB
  maxRedirects: 5,
  userAgent: 'RealityLayer/1.0 (Website Digital Twin; +https://realitylayer.com)',
};

/**
 * Fetch a URL safely with timeout, size limits, and redirect tracking
 */
export async function fetchPage(
  url: string,
  options?: FetchOptions
): Promise<FetchResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  const redirectChain: string[] = [];

  // Validate URL before fetching
  const validation = validateUrl(url);
  if (!validation.valid) {
    return {
      url,
      finalUrl: url,
      statusCode: 0,
      contentType: '',
      html: '',
      responseSize: 0,
      loadTime: 0,
      redirectChain: [],
      error: validation.error,
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), opts.timeout);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': opts.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Check if response redirected
    if (response.redirected && response.url !== url) {
      redirectChain.push(response.url);

      // Validate the final URL too (SSRF protection against redirect to internal)
      const finalValidation = validateUrl(response.url);
      if (!finalValidation.valid) {
        return {
          url,
          finalUrl: response.url,
          statusCode: response.status,
          contentType: '',
          html: '',
          responseSize: 0,
          loadTime: Date.now() - startTime,
          redirectChain,
          error: 'Redirect led to a blocked URL',
        };
      }
    }

    const contentType = response.headers.get('content-type') || '';

    // Check content type — we parse HTML and XML/text markup
    const isTextOrMarkup =
      contentType.includes('text/html') ||
      contentType.includes('application/xhtml') ||
      contentType.includes('application/xml') ||
      contentType.includes('text/xml') ||
      contentType.includes('text/plain');

    // Read body with size limit
    const reader = response.body?.getReader();
    if (!reader) {
      return {
        url,
        finalUrl: response.url || url,
        statusCode: response.status,
        contentType,
        html: '',
        responseSize: 0,
        loadTime: Date.now() - startTime,
        redirectChain,
        error: 'No response body',
      };
    }

    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalSize += value.length;
      if (totalSize > opts.maxResponseSize) {
        reader.cancel();
        return {
          url,
          finalUrl: response.url || url,
          statusCode: response.status,
          contentType,
          html: '',
          responseSize: totalSize,
          loadTime: Date.now() - startTime,
          redirectChain,
          error: 'Response too large',
        };
      }

      chunks.push(value);
    }

    // Combine chunks
    const combined = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    const html = isTextOrMarkup ? new TextDecoder('utf-8').decode(combined) : '';

    return {
      url,
      finalUrl: response.url || url,
      statusCode: response.status,
      contentType,
      html,
      responseSize: totalSize,
      loadTime: Date.now() - startTime,
      redirectChain,
    };
  } catch (error: unknown) {
    const loadTime = Date.now() - startTime;
    let errorMessage = 'Unknown error';

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out';
      } else {
        errorMessage = error.message;
      }
    }

    return {
      url,
      finalUrl: url,
      statusCode: 0,
      contentType: '',
      html: '',
      responseSize: 0,
      loadTime,
      redirectChain,
      error: errorMessage,
    };
  }
}
