/**
 * P10.1 Tests — App Routing (all 10 pages + 404 + nav)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppRoutes, NAV_ITEMS } from '../../src/App';

function renderWithRouter(initialRoute: string) {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe('App Routes', () => {
  it('/ should redirect to /dashboard', () => {
    renderWithRouter('/');
    expect(screen.getByTestId('page-dashboard')).toBeInTheDocument();
  });

  it('/dashboard should render DashboardPage', () => {
    renderWithRouter('/dashboard');
    expect(screen.getByTestId('page-dashboard')).toBeInTheDocument();
  });

  it('/designer should render DesignerPage', () => {
    renderWithRouter('/designer');
    expect(screen.getByTestId('page-designer')).toBeInTheDocument();
  });

  it('/monitor should render MonitorPage', () => {
    renderWithRouter('/monitor');
    expect(screen.getByTestId('page-monitor')).toBeInTheDocument();
  });

  it('/registry should render RegistryPage', () => {
    renderWithRouter('/registry');
    expect(screen.getByTestId('page-registry')).toBeInTheDocument();
  });

  it('/ledger should render LedgerPage', () => {
    renderWithRouter('/ledger');
    expect(screen.getByTestId('page-ledger')).toBeInTheDocument();
  });

  it('/tenants should render TenantsPage', () => {
    renderWithRouter('/tenants');
    expect(screen.getByTestId('page-tenants')).toBeInTheDocument();
  });

  it('/generation-lab should render GenerationLabPage', () => {
    renderWithRouter('/generation-lab');
    expect(screen.getByTestId('page-generationlab')).toBeInTheDocument();
  });

  it('/model-leaderboard should render ModelLeaderboardPage', () => {
    renderWithRouter('/model-leaderboard');
    expect(screen.getByTestId('page-modelleaderboard')).toBeInTheDocument();
  });

  it('/prompt-lab should render PromptLabPage', () => {
    renderWithRouter('/prompt-lab');
    expect(screen.getByTestId('page-promptlab')).toBeInTheDocument();
  });

  it('/quality should render QualityDashboardPage', () => {
    renderWithRouter('/quality');
    expect(screen.getByTestId('page-qualitydashboard')).toBeInTheDocument();
  });

  it('unknown route should render 404', () => {
    renderWithRouter('/unknown-page');
    expect(screen.getByTestId('page-notfound')).toBeInTheDocument();
  });
});

describe('Nav Items', () => {
  it('should have 17 nav items', () => {
    // Track 0 Turn 6 + Turn 8 (v14 Finding R): +Flow Library, +Run Flow (engine)
    // FLOW-01 Phase A6 (DEV-115, GR-001 reconciliation, 2026-04-25):
    //   engine +Attendance (/attendance), admin +Super Agent (/chat) and
    //   +Generation Lab (/generation-lab). Previous: 15 — new: 17.
    expect(NAV_ITEMS).toHaveLength(17);
  });

  it('should have engine, admin, and learning sections', () => {
    const sections = new Set(NAV_ITEMS.map(n => n.section));
    expect(sections.has('engine')).toBe(true);
    expect(sections.has('admin')).toBe(true);
    expect(sections.has('learning')).toBe(true);
  });

  it('engine section should have 11 items', () => {
    // Track 0 Turn 6 + Turn 8: +Flow Library + Run Flow.
    // FLOW-01 Phase A6 (DEV-115, 2026-04-25): +Attendance added. Now 11.
    expect(NAV_ITEMS.filter(n => n.section === 'engine')).toHaveLength(11);
  });

  it('admin section should have 3 items', () => {
    // FLOW-01 Phase A6 (DEV-115, 2026-04-25): Tenants + Super Agent (/chat) +
    // Generation Lab. Previously 2 (pre-admin-expansion).
    expect(NAV_ITEMS.filter(n => n.section === 'admin')).toHaveLength(3);
  });

  it('learning section should have 3 items', () => {
    expect(NAV_ITEMS.filter(n => n.section === 'learning')).toHaveLength(3);
  });

  it('all nav items should have path and label', () => {
    for (const item of NAV_ITEMS) {
      expect(item.path).toBeTruthy();
      expect(item.label).toBeTruthy();
    }
  });
});
