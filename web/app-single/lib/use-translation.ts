"use client";

import { useEffect, useState } from "react";

const t: Record<string, Record<string, string>> = {
  en: {
    app_name: "Masterly Air Academy",
    tagline: "Approved Training Organization",
    hero_title: "Your Aviation Career Starts Here",
    hero_desc: "Masterly Air Academy delivers world-class flight training with a modern fleet, experienced instructors, and a rigorous curriculum designed to produce safe, competent, and professional pilots.",
    explore_programs: "Explore Programs", contact_us: "Contact Us",
    programs_title: "Training Programs", programs_subtitle: "Choose Your Path",
    programs_desc: "Structured programs from your first discovery flight to airline-ready certification.",
    about_title: "About the Academy", about_heading: "Training Pilots to the Highest Standard",
    about_p1: "Masterly Air Academy is an Approved Training Organization (ATO) dedicated to producing pilots who meet and exceed industry standards.",
    about_p2: "We operate a modern fleet of single and multi-engine aircraft, supported by experienced instructors.",
    about_p3: "Every step of your journey is tracked, assessed, and supported through our integrated training management system.",
    why_us_title: "Why Masterly Air Academy", why_us_subtitle: "Built for Serious Training",
    ato_certified: "ATO Certified", ato_certified_desc: "Fully approved by the civil aviation authority.",
    modern_fleet: "Modern Fleet", modern_fleet_desc: "Glass-cockpit aircraft maintained to the highest standards.",
    efficient_training: "Efficient Training", efficient_training_desc: "Structured progression with clear milestones and integrated digital tracking.",
    portal_access: "Academy Portal Access", portal_access_desc: "Select your portal to continue.",
    student_portal: "Student Portal", staff_access: "Staff Access", administration: "Administration",
    programs: "Programs", about: "About", why_us: "Why Us", student_access: "Student Access", nav_student: "Student Access",
    footer_onprem: "100% On-Premise", footer_languages: "EN | FR | العربية", footer_copyright: "Masterly Air Academy. All rights reserved.",
    prog_ppl_desc: "The foundation of your aviation career. Learn basic flight maneuvers, navigation, and aircraft handling.",
    prog_cpl_desc: "Advanced training for professional pilots. Master complex aircraft operations and multi-engine handling.",
    prog_ir_desc: "Fly solely by reference to instruments. Essential for commercial operations in all weather conditions.",
    prog_mep_desc: "Transition to multi-engine aircraft. Learn asymmetric flight management and engine-out procedures.",
    prog_mcc_desc: "Prepare for airline operations. Develop crew resource management and multi-pilot cockpit discipline.",
    expert_team: "Expert Team", expert_team_desc: "Instructors with thousands of hours of instructional and operational experience.",
    structured_curriculum: "Structured Curriculum", structured_curriculum_desc: "Approved syllabus aligned with international aviation standards.",
    full_support: "Full Support", full_support_desc: "Dedicated ground school, briefing facilities, and student progress tracking.",
    login_title: "Staff Login", login_email: "Email", login_password: "Password",
    login_signin: "Sign In", login_signing: "Signing in...", login_admin_link: "Admin? Go to Admin Panel",
    student_login_title: "Student Portal", student_wrong_portal: "This portal is for students only. Please use Staff Login.",
    dashboard_welcome: "Welcome back", dashboard_overview: "Your training overview",
    exams_available: "Available Exams", exams_my_results: "My Results", exams_start: "Start Exam",
    exams_retake: "Retake Exam", exams_max: "Max Attempts Reached",
    exams_submit: "Submit Exam", exams_in_progress: "Exam in Progress",
    exams_results: "Exam Results", exams_back: "Back to Exams",
    exams_passed: "Passed", exams_failed: "Failed", exams_score: "correct",
    common_loading: "Loading...", common_logout: "Logout", common_back: "Back to Dashboard",
    anti_cheat_title: "Anti-Cheat System Active",
    anti_cheat_desc: "This exam is monitored. Switching tabs, minimizing the window, or opening another application will be detected.",
    anti_cheat_warning: "A second violation will immediately submit your exam with your current answers.",
    anti_cheat_understand: "I Understand",
  },
  fr: {
    app_name: "Masterly Air Academy",
    tagline: "Organisme de Formation Agree",
    hero_title: "Votre Carriere Aeronautique Commence Ici",
    hero_desc: "Masterly Air Academy offre une formation au pilotage de classe mondiale avec une flotte moderne et des instructeurs experimentes.",
    explore_programs: "Explorer les Programmes", contact_us: "Contactez-Nous",
    programs_title: "Programmes de Formation", programs_subtitle: "Choisissez Votre Voie",
    programs_desc: "Des programmes structures depuis votre premier vol jusqu'a la certification.",
    about_title: "A propos de l'Academie", about_heading: "Former des Pilotes au Plus Haut Niveau",
    about_p1: "Masterly Air Academy est un Organisme de Formation Agree (ATO) dedie a la production de pilotes qui repondent aux normes.",
    about_p2: "Nous exploitons une flotte moderne d'avions, soutenue par des instructeurs experimentes.",
    about_p3: "Chaque etape de votre parcours est suivie grace a notre systeme integre de gestion.",
    why_us_title: "Pourquoi Masterly Air Academy", why_us_subtitle: "Construite pour une Formation Serieuse",
    ato_certified: "ATO Certifiee", ato_certified_desc: "Approuvee par l'autorite de l'aviation civile.",
    modern_fleet: "Flotte Moderne", modern_fleet_desc: "Avions a cockpits numeriques maintenus aux normes les plus elevees.",
    efficient_training: "Formation Efficace", efficient_training_desc: "Progression structuree avec jalons clairs et suivi numerique.",
    portal_access: "Acces au Portail", portal_access_desc: "Selectionnez votre portail pour continuer.",
    student_portal: "Portail Etudiant", staff_access: "Acces Personnel", administration: "Administration",
    programs: "Programmes", about: "A propos", why_us: "Pourquoi Nous", student_access: "Acces Etudiant", nav_student: "Acces Etudiant",
    footer_onprem: "100% Sur Site", footer_languages: "EN | FR | العربية", footer_copyright: "Masterly Air Academy. Tous droits reserves.",
    prog_ppl_desc: "Le fondement de votre carriere. Apprenez les manoeuvres de base, la navigation et le pilotage.",
    prog_cpl_desc: "Formation avancee pour pilotes professionnels. Maitrisez les operations complexes et le pilotage multimoteur.",
    prog_ir_desc: "Volez uniquement aux instruments. Essentiel pour les operations commerciales par tous les temps.",
    prog_mep_desc: "Transition vers les avions multimoteurs. Apprenez la gestion du vol asymetrique.",
    prog_mcc_desc: "Preparation aux operations aeriennes. Developpez la gestion des ressources de l'equipage.",
    expert_team: "Equipe Experimentee", expert_team_desc: "Instructeurs avec des milliers d'heures d'experience.",
    structured_curriculum: "Programme Structure", structured_curriculum_desc: "Programme approuve conforme aux normes internationales.",
    full_support: "Support Complet", full_support_desc: "Ecole au sol dediee, salles de briefing et suivi des progres.",
    login_title: "Connexion Personnel", login_email: "Email", login_password: "Mot de Passe",
    login_signin: "Se Connecter", login_signing: "Connexion...", login_admin_link: "Admin ? Panneau d'administration",
    student_login_title: "Portail Etudiant", student_wrong_portal: "Ce portail est reserve aux etudiants.",
    dashboard_welcome: "Bon retour", dashboard_overview: "Apercu de votre formation",
    exams_available: "Examens disponibles", exams_my_results: "Mes Resultats", exams_start: "Commencer",
    exams_retake: "Repasser", exams_max: "Maximum atteint",
    exams_submit: "Soumettre", exams_in_progress: "Examen en cours",
    exams_results: "Resultats", exams_back: "Retour aux Examens",
    exams_passed: "Reussi", exams_failed: "Echoue", exams_score: "correct",
    common_loading: "Chargement...", common_logout: "Deconnexion", common_back: "Retour au tableau de bord",
    anti_cheat_title: "Systeme Anti-Triche Actif",
    anti_cheat_desc: "Cet examen est surveille. Changer d'onglet ou d'application sera detecte.",
    anti_cheat_warning: "Une deuxieme violation soumettra automatiquement votre examen.",
    anti_cheat_understand: "J'ai compris",
  },
  ar: {
    app_name: "أكاديمية ماسترلي للطيران",
    tagline: "منظمة تدريب معتمدة",
    hero_title: "مسيرتك المهنية في الطيران تبدأ هنا",
    hero_desc: "تقدم أكاديمية ماسترلي للطيران تدريباً بمستوى عالمي مع أسطول حديث ومدربين ذوي خبرة.",
    explore_programs: "استكشاف البرامج", contact_us: "اتصل بنا",
    programs_title: "برامج التدريب", programs_subtitle: "اختر مسارك",
    programs_desc: "برامج منظمة من أول رحلة استكشافية إلى شهادة الطيار التجاري.",
    about_title: "عن الأكاديمية", about_heading: "تدريب الطيارين بأعلى المعايير",
    about_p1: "أكاديمية ماسترلي للطيران هي منظمة تدريب معتمدة مكرسة لتخريج طيارين يلبون معايير الصناعة.",
    about_p2: "نشغل أسطولاً حديثاً من الطائرات، مدعوماً بمدربين ذوي خبرة.",
    about_p3: "يتم تتبع كل خطوة في رحلتك من خلال نظام إدارة التدريب المتكامل.",
    why_us_title: "لماذا أكاديمية ماسترلي للطيران", why_us_subtitle: "مبنية للتدريب الجاد",
    ato_certified: "معتمدة ATO", ato_certified_desc: "معتمدة بالكامل من قبل سلطة الطيران المدني.",
    modern_fleet: "أسطول حديث", modern_fleet_desc: "طائرات ذات قمرة قيادة زجاجية بأعلى المعايير.",
    efficient_training: "تدريب فعال", efficient_training_desc: "تقدم منظم مع مراحل واضحة وتتبع رقمي متكامل.",
    portal_access: "الوصول إلى البوابة", portal_access_desc: "اختر بوابتك للمتابعة.",
    student_portal: "بوابة الطالب", staff_access: "دخول الموظفين", administration: "الإدارة",
    programs: "البرامج", about: "عن الأكاديمية", why_us: "لماذا نحن", student_access: "دخول الطلاب", nav_student: "دخول الطلاب",
    footer_onprem: "١٠٠٪ على الخادم المحلي", footer_languages: "EN | FR | العربية", footer_copyright: "أكاديمية ماسترلي للطيران. جميع الحقوق محفوظة.",
    prog_ppl_desc: "أساس مسيرتك في الطيران. تعلم مناورات الطيران الأساسية والملاحة.",
    prog_cpl_desc: "تدريب متقدم للطيارين المحترفين. إتقان العمليات المعقدة والطيران متعدد المحركات.",
    prog_ir_desc: "الطيران بالاعتماد على الأجهزة فقط. أساسي للعمليات التجارية.",
    prog_mep_desc: "الانتقال إلى الطائرات متعددة المحركات. تعلم إدارة الطيران غير المتماثل.",
    prog_mcc_desc: "الاستعداد لعمليات الخطوط الجوية. تطوير إدارة موارد الطاقم.",
    expert_team: "فريق خبير", expert_team_desc: "مدربون بآلاف الساعات من الخبرة.",
    structured_curriculum: "منهج منظم", structured_curriculum_desc: "منهج معتمد متوافق مع المعايير الدولية.",
    full_support: "دعم كامل", full_support_desc: "مدرسة أرضية مخصصة ومرافق إحاطة وتتبع تقدم الطالب.",
    login_title: "تسجيل دخول الموظفين", login_email: "البريد الإلكتروني", login_password: "كلمة المرور",
    login_signin: "تسجيل الدخول", login_signing: "جاري التسجيل...", login_admin_link: "مسؤول؟ لوحة الإدارة",
    student_login_title: "بوابة الطالب", student_wrong_portal: "هذه البوابة مخصصة للطلاب فقط.",
    dashboard_welcome: "مرحباً بعودتك", dashboard_overview: "نظرة عامة على تدريبك",
    exams_available: "الامتحانات المتاحة", exams_my_results: "نتائجي", exams_start: "بدء الامتحان",
    exams_retake: "إعادة الامتحان", exams_max: "الحد الأقصى",
    exams_submit: "تسليم الامتحان", exams_in_progress: "الامتحان قيد التقدم",
    exams_results: "نتائج الامتحان", exams_back: "العودة للامتحانات",
    exams_passed: "ناجح", exams_failed: "راسب", exams_score: "صحيح",
    common_loading: "جار التحميل...", common_logout: "تسجيل الخروج", common_back: "العودة للوحة القيادة",
    anti_cheat_title: "نظام مكافحة الغش نشط",
    anti_cheat_desc: "هذا الامتحان مراقب. سيتم اكتشاف تبديل علامات التبويب أو فتح تطبيقات أخرى.",
    anti_cheat_warning: "المخالفة الثانية ستؤدي إلى تسليم الامتحان تلقائياً.",
    anti_cheat_understand: "فهمت",
  },
};

function readLocale(): string {
  if (typeof window === "undefined") return "en";
  const seg = window.location.pathname.split("/").filter(Boolean)[0];
  if (seg === "fr" || seg === "ar") return seg;
  try { const m = document.cookie.match(/(?:^|; )locale=([^;]*)/); if (m) return m[1]; } catch {}
  return "en";
}

export function useTranslation() {
  const [locale, setLocale] = useState(readLocale);
  const [strings, setStrings] = useState<Record<string, string>>(() => t[readLocale()] || t.en);

  useEffect(() => {
    const loc = readLocale();
    if (loc !== locale) { setLocale(loc); setStrings(t[loc] || t.en); }
  }, []);

  const switchTo = (code: string) => {
    document.cookie = `locale=${code};path=/;max-age=${365 * 24 * 60 * 60}`;
    setLocale(code); setStrings(t[code] || t.en);
  };

  return { t: strings, locale, switchTo };
}
