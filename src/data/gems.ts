export interface GemEntry {
  key: string;
  name: string;
  role: string;
  state: string;
  direction: string;
  future: string;
  fit: string;
}

/**
 * Public-facing GEM family.
 * Roles follow the established FDS terminology (see projects.ts hero alt):
 * Topaz = reasoning & insight, Sapphire = optimization & performance,
 * Peridot = evaluation & validation, Garnet = automation & execution.
 */
export const gems: GemEntry[] = [
  {
    key: 'topaz',
    name: 'Topaz',
    role: 'General intelligence foundation',
    state: 'LEARNING',
    direction:
      'General reasoning, language understanding, instruction following, knowledge work, and multi-step problem solving — with longer-context understanding as development progresses.',
    future:
      'Act as the core reasoning layer behind research assistance, tool-oriented workflows, and the broader GEMS family.',
    fit: 'The foundational member of the family: a general base other GEMs build on and specialize from.'
  },
  {
    key: 'sapphire',
    name: 'Sapphire',
    role: 'Optimization and performance',
    state: 'EVOLVING',
    direction:
      'Efficiency, speed, and resource-aware execution — how intelligence can run well on the compute actually available rather than only at maximum cost.',
    future: 'Help make capable AI work faster and cheaper to deliver, complementing the rest of the family.',
    fit: 'Exists separately because performance is its own discipline; a specialized GEM can pursue efficiency the general model should not carry alone.'
  },
  {
    key: 'peridot',
    name: 'Peridot',
    role: 'Evaluation and validation',
    state: 'EVOLVING',
    direction:
      'Testing and measuring whether a model actually learned the intended skill instead of memorizing patterns or succeeding by accident.',
    future: 'Serve as the discipline that decides what is proven enough to advance and what still needs work.',
    fit: "The family's evaluator: the reason claims about capability are backed by evidence rather than activity."
  },
  {
    key: 'garnet',
    name: 'Garnet',
    role: 'Automation and execution',
    state: 'EVOLVING',
    direction:
      'Workflow automation, tool execution, and structured professional workflows — including publishing, writing, and illustration assistance tied to Kayla-related work.',
    future: 'Turn intelligence into action: carry out structured tasks under human direction, including human-supervised professional tooling.',
    fit: 'Connects GEMS research to real product work, especially creative and structured workflows.'
  }
];

export interface LearningStage {
  num: string;
  title: string;
  desc: string;
}

export const learningStages: LearningStage[] = [
  { num: '01', title: 'Build the Foundation', desc: 'Develop the underlying model, tokenizer, data pipeline, and training environment.' },
  { num: '02', title: 'Teach', desc: 'Train the GEM on carefully prepared material and tasks appropriate to its developing role.' },
  { num: '03', title: 'Test', desc: 'Evaluate whether the model actually learned the intended skill instead of memorizing patterns or succeeding by accident.' },
  { num: '04', title: 'Diagnose', desc: 'Study failures, weak generalization, repetition, reasoning mistakes, context limits, and other measurable problems.' },
  { num: '05', title: 'Refine', desc: 'Adjust the curriculum, architecture, evaluation, or training strategy based on evidence.' },
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
  { area: 'Writing & creative workflows', status: 'in-development', note: 'Drafting, editing, and illustration support tied to publishing work.' },
  { area: 'Publishing workflows', status: 'in-development', note: 'Moving ideas toward finished, production-ready work.' },
  { area: 'Knowledge retrieval', status: 'in-development', note: 'Grounded answers from provided sources.' },
  { area: 'Long-context understanding', status: 'long-term', note: 'Working across longer documents and sessions as models develop.' },
  { area: 'Game & world development', status: 'long-term', note: 'Assistance for interactive experiences, explored with KyraBlox.' },
  { area: 'Multimodal interaction', status: 'long-term', note: 'Working across text, image, and other inputs over time.' },
  {
    area: 'Structured professional workflows',
    status: 'long-term',
    note: 'Human-supervised tooling, including medical-coding research framed as workflow support — not diagnosis or medical advice.'
  }
];

export const affordability = {
  lead: 'One reason FDS is building its own GEMS family is economic access.',
  body: 'The destination is not "cheap AI." It is capable AI that ordinary people, creators, developers, families, small organizations, and communities can actually afford to use. We are working toward the depth and usefulness people associate with premium frontier assistants — deep reasoning, long-context work, capable creation, coding, and tool use — while researching how much of that experience can be delivered through smaller, specialized, efficient systems instead of permanently attaching every useful task to frontier-model pricing.',
  target:
    'This is an aspirational experience target, not a claim of current parity with Claude Opus, GPT/Sol-class systems, or any other frontier model.'
};
