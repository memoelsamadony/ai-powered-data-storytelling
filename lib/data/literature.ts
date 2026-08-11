/** Surveyed systems (report §3) and the gap that motivates the project. */

export interface SurveyedSystem {
  name: string;
  yearVenue: string;
  type: string;
  role: string;
}

export const surveyedSystems: SurveyedSystem[] = [
  {
    name: "Voder",
    yearVenue: "2018 · IEEE InfoVis",
    type: "Template NLG",
    role: "Interactive data facts from a chart; non-LLM baseline.",
  },
  {
    name: "Calliope",
    yearVenue: "2021 · IEEE TVCG",
    type: "Algorithmic (MCTS)",
    role: "Auto visual data stories from a spreadsheet; non-LLM baseline.",
  },
  {
    name: "DataNarrative",
    yearVenue: "2024 · EMNLP",
    type: "LLM, two agents (generate + verify)",
    role: "Closest precedent: we swap its factual verifier for an emotional moderator.",
  },
  {
    name: "MDSF",
    yearVenue: "2025 · arXiv",
    type: "LLM multi-agent pipeline",
    role: "Pipeline blueprint plus a ready-made evaluation kit (Task 5).",
  },
  {
    name: "InReAcTable",
    yearVenue: "2025 · UIST",
    type: "LLM ReAct agent",
    role: "Interactive visual stories from tables; UI patterns.",
  },
  {
    name: "Data Director",
    yearVenue: "2024 · IEEE VIS",
    type: "LLM multi-agent (analyst + designer)",
    role: "Autonomous animated data video; even proposes adding an evaluation agent.",
  },
  {
    name: "DataTales",
    yearVenue: "2025 · arXiv",
    type: "LLM benchmark (data narration)",
    role: "Real-world narration benchmark; grounds our analytical-correctness metrics.",
  },
];

export interface Reference {
  id: number;
  authors: string;
  title: string;
  venue: string;
}

export const references: Reference[] = [
  { id: 1, authors: "J. Segel and J. Heer", title: "Narrative Visualization: Telling Stories with Data", venue: "IEEE TVCG 16(6), 2010" },
  { id: 2, authors: "J. Hullman and N. Diakopoulos", title: "Visualization Rhetoric: Framing Effects in Narrative Visualization", venue: "IEEE TVCG 17(12), 2011" },
  { id: 3, authors: "M. T. Islam et al.", title: "DataNarrative: Automated Data-Driven Storytelling with Visualizations and Texts", venue: "EMNLP 2024 · arXiv:2408.05346" },
  { id: 4, authors: "Anon.", title: "MDSF: A Multimodal Data Storytelling Framework", venue: "2025 · arXiv:2501.01014" },
  { id: 5, authors: "Aodeng et al.", title: "InReAcTable: Interactive Visual Data Stories from Tables via a ReAct Agent", venue: "UIST 2025 · arXiv:2508.18174" },
  { id: 6, authors: "L. Shen, H. Li, Y. Wang, H. Qu", title: "From Data to Story (Data Director)", venue: "IEEE VIS (Gen4DS) 2024 · arXiv:2408.03876" },
  { id: 7, authors: "Z. Kasner and O. Dušek", title: "Beyond Traditional Benchmarks: Analyzing Behaviors of Open LLMs on Data-to-Text Generation", venue: "ACL 2024 · arXiv:2401.10186" },
  { id: 8, authors: "A. Lo Duca", title: "Towards a Framework for AI-Assisted Data Storytelling", venue: "WEBIST 2023, SCITEPRESS" },
  { id: 9, authors: "Y. Yang et al.", title: "DataTales: A Benchmark for Real-World Intelligent Data Narration", venue: "2025 · arXiv:2410.17859" },
];
