export const forgeremsChangelog = [
  {
    version: 'v1.2.3-preview.1',
    date: '2026-07-02',
    status: 'preview',
    changes: [
      'Technician diagnostics, system information, drive validation, and USB intelligence.',
      'Canonical packages and version history are maintained on GitHub Releases.'
    ]
  }
];

export function getForgerEMSChangelog(): { version: string; date: string; status: string; changes: string[] }[] {
  return forgeremsChangelog;
}

export function getLatestForgerEMSVersion(): string {
  return forgeremsChangelog[0]?.version || 'Public Preview';
}
