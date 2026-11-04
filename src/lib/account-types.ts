export type Account = { id: string; name: string; email: string; role: "student" | "instructor"; studentNumber: string; group: string; enrolledAt: string };
export type Viewer = { account: Account | null; googleReady: boolean };
export const feedbackCriteria = [
  {id:"concept",label:"Ideja i strategija",description:"Vizuelne odluke proizlaze iz vizije, misije i publike."},
  {id:"identity",label:"Znak i paleta",description:"Znak je jasan, boje imaju uloge i dovoljan kontrast."},
  {id:"typography",label:"Tipografija",description:"Čitljivost, hijerarhija i podrška za naša slova."},
  {id:"application",label:"Primjena identiteta",description:"Memorandum i druge primjene čine povezanu cjelinu."},
  {id:"reasoning",label:"Obrazloženje i autorstvo",description:"Izvori, autorske dorade i upotreba AI alata su jasno navedeni."},
] as const;
export type Criterion = typeof feedbackCriteria[number]["id"];
export type Feedback = { status: "changes_requested" | "reviewed"; comment: string; criteria: Partial<Record<Criterion,"clear"|"needs_work">> };
export type Submission = { id:string; projectId:string; projectName:string; authorName:string; version:number; projectRevision:number; createdAt:string; status:"submitted"|"changes_requested"|"reviewed"; comment:string; criteria:Feedback["criteria"]; reviewedAt:string|null; reviewerName:string|null; ownerId?:string; ownerEmail?:string };
export const submissionLabels = {submitted:"Čeka pregled",changes_requested:"Potrebna dorada",reviewed:"Pregledano"};
