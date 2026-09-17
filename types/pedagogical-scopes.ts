export type Subject = {
  active: boolean;
  id: string;
  name: string;
};

export type PedagogicalScope = {
  active: boolean;
  archivedAt: string | null;
  classId: string;
  id: string;
  subjectId: string;
  userId: string;
};
