export interface GemEntry {
  key: string;
  name: string;
  role: string;
  state: string;
  direction: string;
  researchStatus: string;
  future: string;
  fit: string;
  notClaimed: string;
}

/**
 * Canonical "where are we now" snapshot for the GEMS program. GEMS is the
 * original, longer-horizon from-scratch model research effort; a separate,
 * not-yet-publicly-named project covers pretrained-foundation specialization
 * and is intentionally not represented here. Update these values here (not in
 * page copy) when the research state changes.
 */
export const gemsCurrentStatus = {
  generation: 'Research program',
  phase: 'From-scratch model research — Training Grounds active',
  publicModel: 'Not released',
  trainingStatus: 'Research in progress',
  lineages: 'Topaz · Sapphire · Peridot · Garnet'
} as const;

/**
 * Public-facing GEM family. Each lineage is developed from scratch through
 * Training Grounds curriculum, training, and evaluation — no lineage begins
 * from an acquired pretrained checkpoint.
 */
export const gems: GemEntry[] = [
  {
    key: 'topaz',
    name: 'Topaz',
    role: 'General intelligence and orchestration',
    state: 'RESEARCH',
    direction:
      'Broad language, reasoning, planning, instruction following, and coordination across specialist systems.',
    researchStatus:
      'No checkpoint has been trained or evaluated for Topaz. Curriculum and evaluation design for its generalist, orchestration-focused role is in early Training Grounds research.',
    future:
      'Become the broadest GEMS generalist and orchestrate specialists where focused expertise is more useful than one model doing everything.',
    fit: 'The broad generalist in a family of independent lineages—not a shared base that every other GEM inherits.',
    notClaimed: 'No released Topaz model, frontier parity, or validated capability is claimed.'
  },
  {
    key: 'sapphire',
    name: 'Sapphire',
    role: 'Software engineering and coding',
    state: 'RESEARCH',
    direction:
      'Code generation, repair, repository reasoning, navigation, testing, and structured engineering tool use.',
    researchStatus:
      'No checkpoint has been trained or evaluated for Sapphire. Its software-engineering curriculum, repository-reasoning tasks, and evaluation design are in early Training Grounds research.',
    future: 'Develop into the software-engineering specialist intended to support CodeForge-oriented research and other repository work.',
    fit: 'The coding specialist; its role is distinct from CodeForge, which is already a public engineering product.',
    notClaimed: 'No trained Sapphire model exists, and no Sapphire capability is presented as shipping in CodeForge.'
  },
  {
    key: 'peridot',
    name: 'Peridot',
    role: 'Mathematics and technical reasoning',
    state: 'RESEARCH',
    direction:
      'Mathematics, formal and quantitative reasoning, science, structured problem solving, and verifiable technical work.',
    researchStatus:
      'No checkpoint has been trained or evaluated for Peridot. Its mathematics and technical-reasoning curriculum, with programmatic and formal verification, is in early Training Grounds research.',
    future: 'Pursue correctness-first reasoning with programmatic, symbolic, and formal verification where appropriate.',
    fit: 'The quantitative specialist. Training Grounds—not Peridot itself—owns the shared evaluation and advancement discipline.',
    notClaimed: 'No trained Peridot model, independently verified benchmark result, or production capability is claimed.'
  },
  {
    key: 'garnet',
    name: 'Garnet',
    role: 'Multimodal and publishing intelligence',
    state: 'RESEARCH',
    direction:
      'Document and visual understanding, publishing workflows, and multimodal production with separately evaluated components.',
    researchStatus:
      'No checkpoint has been trained or evaluated for Garnet. Its document, vision, and publishing-oriented curriculum is in early Training Grounds research; image generation remains a separate, longer-term module direction with no committed approach yet.',
    future: 'Develop a multimodal system that can support document, vision, publishing, and image-generation workflows without conflating unlike model components.',
    fit: 'The multimodal specialist, with potential relevance to Kayla Publisher while remaining a separate research lineage and system.',
    notClaimed: 'No trained Garnet model exists, and image generation is not claimed as a current Garnet capability.'
  }
];

export interface LearningStage {
  num: string;
  title: string;
  desc: string;
}

export const learningStages: LearningStage[] = [
  { num: '01', title: 'Set the Curriculum', desc: 'Define the curriculum, tasks, and evaluation plan suited to the target role and its research stage.' },
  { num: '02', title: 'Teach', desc: 'Train the GEM on carefully prepared material and tasks appropriate to its developing role.' },
  { num: '03', title: 'Test', desc: 'Evaluate whether the model actually learned the intended skill instead of memorizing patterns or succeeding by accident.' },
  { num: '04', title: 'Diagnose', desc: 'Study failures, weak generalization, repetition, reasoning mistakes, context limits, and other measurable problems.' },
  { num: '05', title: 'Refine', desc: 'Adjust curriculum, post-training, evaluation, or model strategy based on the findings.' },
  { num: '06', title: 'Expand', desc: 'Increase capability, context, tool use, specialization, and real-world usefulness as each rung is proven.' },
  { num: '07', title: 'Apply', desc: 'Integrate what is mature enough into FDS systems and applications while research continues in Training Grounds.' }
];

export type CapabilityStatus = 'current' | 'in-development' | 'long-term';

export interface Capability {
  area: string;
  status: CapabilityStatus;
  note: string;
}

export const capabilityRoadmap: Capability[] = [
  { area: 'Reasoning', status: 'in-development', note: 'Multi-step problem solving and general inference across the family.' },
  { area: 'Research assistance', status: 'in-development', note: 'Helping people explore, summarize, and reason over material.' },
  { area: 'Tool use & agentic execution', status: 'in-development', note: 'Carrying out steps under human control, not autonomous decisions.' },
  { area: 'Coding assistance', status: 'in-development', note: 'Support for building and testing software.' },
  { area: 'Writing & creative work', status: 'in-development', note: 'Drafting, editing, and illustration support tied to publishing projects.' },
  { area: 'Publishing production', status: 'in-development', note: 'Moving ideas toward finished, production-ready work.' },
  { area: 'Knowledge retrieval', status: 'in-development', note: 'Grounded answers from provided sources.' },
  { area: 'Long-context understanding', status: 'long-term', note: 'Working across longer documents and sessions as models develop.' },
  { area: 'Game & world development', status: 'long-term', note: 'Assistance for interactive experiences, explored with KyraBlox.' },
  { area: 'Document & visual understanding', status: 'in-development', note: "Garnet's from-scratch research across text, images, video, and documents; capability is not yet validated." },
  { area: 'Image generation', status: 'long-term', note: 'A separate, longer-term Garnet module direction, with no committed approach yet.' },
  {
    area: 'Structured professional tasks',
    status: 'long-term',
    note: 'Human-supervised tooling, including medical-coding research framed as task support — not diagnosis or medical advice.'
  }
];

export const affordability = {
  lead: 'One reason FDS is developing the GEMS family is economic access.',
  body: 'The destination is not "cheap AI." It is capable AI that ordinary people, creators, developers, families, small organizations, and communities can actually afford to use. We are working toward the depth and usefulness people associate with premium frontier assistants — deep reasoning, long-context work, capable creation, coding, and tool use — while researching how much of that experience can be delivered through smaller, specialized, efficient systems instead of permanently attaching every useful task to frontier-model pricing.',
  target:
    'This is an aspirational experience target, not a claim of current parity with Claude Opus, GPT/Sol-class systems, or any other frontier model.'
};
