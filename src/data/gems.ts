export interface GemEntry {
  key: string;
  name: string;
  role: string;
  state: string;
  direction: string;
  foundationStrategy: string;
  future: string;
  fit: string;
  notClaimed: string;
}

/**
 * Canonical "where are we now" snapshot for the GEMS program. Values mirror the
 * Phase 158 Generation 0 records referenced across the site; update them here
 * (not in page copy) when the research state changes.
 */
export const gemsCurrentStatus = {
  generation: 'Generation 0',
  phase: 'Phase 158 — foundation selection & governed acquisition',
  publicModel: 'Not released',
  trainingStatus: 'Research in progress',
  lineages: 'Topaz · Sapphire · Peridot · Garnet'
} as const;

/**
 * Public-facing GEM family, aligned with the Phase 158 Generation 0
 * specialization and foundation-selection records.
 */
export const gems: GemEntry[] = [
  {
    key: 'topaz',
    name: 'Topaz',
    role: 'General intelligence and orchestration',
    state: 'RESEARCH',
    direction:
      'Broad language, reasoning, planning, instruction following, and coordination across specialist systems.',
    foundationStrategy:
      'Generation 0 recommends an OLMo 2 base checkpoint for its transparent research lineage and broad language foundation. The candidate has not been acquired, trained, or evaluated as a GEMS model.',
    future:
      'Become the broadest GEMS generalist and orchestrate specialists where focused expertise is more useful than one model doing everything.',
    fit: 'The broad generalist in a family of independent lineages—not a shared base that every other GEM inherits.',
    notClaimed: 'No released Topaz model, frontier parity, or validated Generation 0 capability is claimed.'
  },
  {
    key: 'sapphire',
    name: 'Sapphire',
    role: 'Software engineering and coding',
    state: 'RESEARCH',
    direction:
      'Code generation, repair, repository reasoning, navigation, testing, and structured engineering tool use.',
    foundationStrategy:
      'Generation 0 recommends a Qwen2.5-Coder base checkpoint. Its long-context and repository-level behavior still require independent GEMS preflight and evaluation.',
    future: 'Develop into the software-engineering specialist intended to support CodeForge-oriented research and other repository work.',
    fit: 'The coding specialist; its role is distinct from CodeForge, which is already a public engineering product.',
    notClaimed: 'The upstream candidate is not a trained Sapphire model, and no Sapphire capability is presented as shipping in CodeForge.'
  },
  {
    key: 'peridot',
    name: 'Peridot',
    role: 'Mathematics and technical reasoning',
    state: 'RESEARCH',
    direction:
      'Mathematics, formal and quantitative reasoning, science, structured problem solving, and verifiable technical work.',
    foundationStrategy:
      'Generation 0 recommends a Mathstral base checkpoint for math and scientific specialization. Its upstream benchmark claims remain subject to independent GEMS evaluation.',
    future: 'Pursue correctness-first reasoning with programmatic, symbolic, and formal verification where appropriate.',
    fit: 'The quantitative specialist. Training Grounds—not Peridot itself—owns the shared evaluation and advancement discipline.',
    notClaimed: 'No acquired or trained Peridot Generation 0 model, independently verified benchmark result, or production capability is claimed.'
  },
  {
    key: 'garnet',
    name: 'Garnet',
    role: 'Multimodal and publishing intelligence',
    state: 'RESEARCH',
    direction:
      'Document and visual understanding, publishing workflows, and multimodal production with separately evaluated components.',
    foundationStrategy:
      'Generation 0 is researching a SmolVLM2 base checkpoint for vision-language work. Its acquisition is partial and paused. FLUX.1-schnell is registered separately as a gated, unacquired image-generation candidate.',
    future: 'Develop a multimodal system that can support document, vision, publishing, and image-generation workflows without conflating unlike model components.',
    fit: 'The multimodal specialist, with potential relevance to Kayla Publisher while remaining a separate research lineage and system.',
    notClaimed: 'SmolVLM2 is not credited with image generation, FLUX is not a Garnet capability yet, and no trained Garnet model is available.'
  }
];

export interface LearningStage {
  num: string;
  title: string;
  desc: string;
}

export const learningStages: LearningStage[] = [
  { num: '01', title: 'Select the Foundation', desc: 'Choose an open foundation suited to the target role, license, compute, and evaluation plan.' },
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
  { area: 'Document & visual understanding', status: 'in-development', note: 'Garnet foundation research across text, images, video, and documents; capability is not yet validated.' },
  { area: 'Image generation', status: 'long-term', note: 'A separate Garnet module direction, currently represented only by a gated, unacquired FLUX candidate.' },
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
