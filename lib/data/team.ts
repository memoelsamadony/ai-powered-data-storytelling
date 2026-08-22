/** Team, supervisors, and course metadata for the About page and footer. */

export interface TeamMember {
  name: string;
  matrikel: string;
  initials: string;
}

export const team: TeamMember[] = [
  { name: "Mahmoud Elsamadony", matrikel: "5318606", initials: "ME" },
  { name: "Ahmed Okasha", matrikel: "5331225", initials: "AO" },
  { name: "Ahmed Elsaadani", matrikel: "5337397", initials: "AE" },
  { name: "Ahmed Saleh", matrikel: "5305729", initials: "AS" },
];

export const supervisors = [
  { name: "Susmita Khadse, M.Sc.", email: "susmita.khadse@tu-dresden.de" },
  { name: "Julián Méndez, M.Sc.", email: "julian.mendez2@tu-dresden.de" },
];

export const course = {
  chair: "Prof. Dr.-Ing. Raimund Dachselt",
  lab: "Interactive Media Lab Dresden",
  unit: "Chair of Multimedia Technology",
  faculty: "Faculty of Computer Science",
  university: "TU Dresden",
  program: "CMS Team Project · Interactive Visual Computing",
  term: "Summer Term 2026 (SoSe 2026)",
  github: "https://github.com/memoelsamadony/ai-powered-data-storytelling",
};
