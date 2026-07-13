export type RootStackParamList = {
  login: undefined;
  '(app)': undefined;
};

export type AppTabParamList = {
  dashboard: undefined;
  courses: undefined;
  flights: undefined;
  exams: undefined;
  '(more)': undefined;
};

export type MoreStackParamList = {
  'more-index': undefined;
  schedule: undefined;
  certificates: undefined;
  invoices: undefined;
  messages: undefined;
  'messages-compose': undefined;
  notifications: undefined;
  profile: undefined;
  settings: undefined;
};

export type CourseStackParamList = {
  'courses-index': undefined;
  'courses-[id)': { id: string };
};

export type FlightStackParamList = {
  'flights-index': undefined;
  'flights-[id)': { id: string };
};

export type ExamStackParamList = {
  'exams-index': undefined;
  'exams-[id)': { id: string };
  'exams-session': { examId: string };
  'exams-result': { score: string; total: string; passed: string };
};
