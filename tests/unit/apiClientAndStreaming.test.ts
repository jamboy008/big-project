import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient, ApiClientError } from '../../src/lib/apiClient';

describe('Unified API Client & SSE Streaming', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('routes requests through /api/v1/ and maps centralized HTTP errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'ORG_ACCESS_DENIED',
            message: 'Access denied for organization',
            status: 403,
          },
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiClient.listTasks('org_unknown')).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 403,
      code: 'ORG_ACCESS_DENIED',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/tasks?organizationId=org_unknown',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('streams SSE delta chunks via ReadableStream and handles completion', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode('event: meta\ndata: {"agentName":"Ops Agent","mode":"demo"}\n\n'),
        );
        controller.enqueue(
          encoder.encode('event: delta\ndata: {"text":"Salom "}\n\n'),
        );
        controller.enqueue(
          encoder.encode('event: delta\ndata: {"text":"ALJABR"}\n\n'),
        );
        controller.enqueue(encoder.encode('event: done\ndata: {"ok":true}\n\n'));
        controller.close();
      },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(stream, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        }),
      ),
    );

    let accumulated = '';
    let metaAgent = '';
    let doneCalled = false;

    await apiClient.streamChat(
      {
        chatId: 'chat_1',
        organizationId: 'org_tashkent_hq',
        message: 'Test',
        history: [],
        attachments: [],
        locale: 'uz',
      },
      {
        onMeta: (m) => {
          metaAgent = m.agentName;
        },
        onDelta: (chunk) => {
          accumulated += chunk;
        },
        onDone: () => {
          doneCalled = true;
        },
        onError: (err) => {
          throw err;
        },
      },
    );

    expect(metaAgent).toBe('Ops Agent');
    expect(accumulated).toBe('Salom ALJABR');
    expect(doneCalled).toBe(true);
  });

  it('aborts request cleanly via AbortController', async () => {
    const controller = new AbortController();
    controller.abort();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')),
    );

    let capturedError: ApiClientError | null = null;
    await apiClient.streamChat(
      {
        chatId: 'chat_1',
        organizationId: 'org_tashkent_hq',
        message: 'Test',
        history: [],
        attachments: [],
        locale: 'uz',
      },
      {
        onDelta: () => {},
        onDone: () => {},
        onError: (err) => {
          capturedError = err;
        },
      },
      { signal: controller.signal },
    );

    expect(capturedError).not.toBeNull();
    expect((capturedError as unknown as ApiClientError).isAborted).toBe(true);
  });
});
