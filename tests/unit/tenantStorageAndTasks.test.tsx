import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AiTasksPage } from '../../src/components/AiTasksPage';
import { SettingsPage } from '../../src/components/SettingsPage';
import { INITIAL_DEMO_TASKS } from '../../src/data/mockPlatformData';
import { TRANSLATIONS } from '../../src/i18n/translations';
import {
  clearAllSensitiveLocalData,
  getTenantStorageKey,
  loadTenantChats,
  purgeLegacyUnsafeStorage,
  saveTenantChats,
} from '../../src/lib/tenantStorage';
import type { ChatSession } from '../../src/types/api';

describe('Multi-Tenant Storage Isolation & Security Cleanup', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('scopes chats strictly by organizationId and userId and purges legacy cc_chats', () => {
    localStorage.setItem('cc_chats', JSON.stringify([{ id: 'legacy' }]));
    localStorage.setItem('aljabr_auth', JSON.stringify({ password: 'plain' }));
    purgeLegacyUnsafeStorage();

    expect(localStorage.getItem('cc_chats')).toBeNull();
    expect(localStorage.getItem('aljabr_auth')).toBeNull();

    const chatOrgA: ChatSession = {
      id: 'c_a',
      organizationId: 'org_a',
      userId: 'user_1',
      title: 'Org A Chat',
      createdAt: '2026-11-23T10:00:00.000Z',
      updatedAt: '2026-11-23T10:00:00.000Z',
      messages: [],
    };
    saveTenantChats('org_a', 'user_1', [chatOrgA]);

    expect(loadTenantChats('org_a', 'user_1')).toHaveLength(1);
    expect(loadTenantChats('org_b', 'user_1')).toBeNull();
    expect(getTenantStorageKey('org_a', 'user_1')).not.toBe('cc_chats');

    clearAllSensitiveLocalData();
    expect(loadTenantChats('org_a', 'user_1')).toBeNull();
  });
});

describe('AI Tasks Module & Operational Guardrails', () => {
  it('filters tasks by status and opens approval modal excluding financial payments', async () => {
    const onDecision = vi.fn().mockResolvedValue(undefined);
    const t = TRANSLATIONS.en;

    render(
      <AiTasksPage
        tasks={INITIAL_DEMO_TASKS.filter((task) => task.organizationId === 'org_tashkent_hq')}
        isLoading={false}
        loadError={null}
        onRetryLoad={() => {}}
        onTaskDecision={onDecision}
        t={t}
      />,
    );

    expect(screen.getByText('TSK-2041')).toBeInTheDocument();
    expect(
      screen.getByText(t.tasks.financialRestrictionNote),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Awaiting Approval' }));
    expect(screen.getByText('TSK-2041')).toBeInTheDocument();
    expect(screen.queryByText('TSK-2040')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Inspect' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => {
      expect(onDecision).toHaveBeenCalledWith('TSK-2041', 'approve', '');
    });
  });
});

describe('Settings Security Policy', () => {
  it('does not expose any user-editable backend URL input', () => {
    const { container } = render(
      <SettingsPage
        apiMode="demo"
        locale="en"
        onChangeLocale={() => {}}
        theme="light"
        onSetTheme={() => {}}
        onClearLocalCache={() => {}}
        t={TRANSLATIONS.en}
      />,
    );

    expect(container.querySelectorAll('input')).toHaveLength(0);
    expect(screen.getByText('/api/v1')).toBeInTheDocument();
  });
});
