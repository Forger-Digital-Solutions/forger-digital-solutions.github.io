export interface LabPrinciple {
  title: string;
  number: string;
  description: string;
}

// FDS engineering principles — presented as working philosophy,
// not industry certifications or formal scientific claims.
export const labPrinciples: LabPrinciple[] = [
  {
    number: '01',
    title: 'Evidence over assumptions',
    description:
      'Systems are not considered successful simply because they executed. Results should provide evidence that the intended objective was achieved.'
  },
  {
    number: '02',
    title: 'Adaptive computation',
    description:
      'Software should understand and adapt to the hardware and compute environments available to it.'
  },
  {
    number: '03',
    title: 'Governed intelligence',
    description:
      'Training, evaluation, experimentation, and deployment should leave understandable evidence.'
  },
  {
    number: '04',
    title: 'Build through experimentation',
    description:
      'Research findings should become reusable architecture only after surviving meaningful real-world use.'
  }
];