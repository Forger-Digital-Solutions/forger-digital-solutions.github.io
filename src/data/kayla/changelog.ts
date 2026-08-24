export const forgeremsChangelog = [
  {
    version: 'v1.2.4-preview.5',
    date: '2025-01-01',
    status: 'preview',
    changes: [
      'Current preview release for testing and feedback.',
      'ZIP archive distribution for Windows.'
    ]
  }
];

export function getForgerEMSChangelog(): { version: string; date: string; status: string; changes: string[] }[] {
  return forgeremsChangelog;
}

export function getLatestForgerEMSVersion(): string {
  return forgeremsChangelog[0]?.version || 'v1.2.4-preview.5';
}
