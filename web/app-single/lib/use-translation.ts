"use client";

import { useEffect, useState } from "react";

// Inline translations (shared/ not accessible from Docker build)
const translations: Record<string, any> = {
  en: {
    app_name: "Masterly Air Academy",
    tagline: "Approved Training Organization",
    hero_title: "Your Aviation Career Starts Here",
    hero_desc: "Masterly Air Academy delivers world-class flight training with a modern fleet, experienced instructors, and a rigorous curriculum designed to produce safe, competent, and professional pilots.",
    explore_programs: "Explore Programs",
    contact_us: "Contact Us",
    programs_title: "Training Programs",
    programs_subtitle: "Choose Your Path",
    programs_desc: "Structured programs from your first discovery flight to airline-ready certification. Every program follows a rigorous, approved syllabus.",
    about_title: "About the Academy",
    about_heading: "Training Pilots to the Highest Standard",
    about_p1: "Masterly Air Academy is an Approved Training Organization (ATO) dedicated to producing pilots who meet and exceed industry standards. Our structured approach combines rigorous theoretical instruction with extensive practical flight training.",
    about_p2: "We operate a modern fleet of single and multi-engine aircraft, supported by experienced instructors who bring thousands of hours of real-world flying experience to every lesson.",
    about_p3: "From your first trial flight to your airline transport license, every step of your journey is tracked, assessed, and supported through our integrated training management system.",
    why_us_title: "Why Masterly Air Academy",
    why_us_subtitle: "Built for Serious Training",
    ato_certified: "ATO Certified",
    ato_certified_desc: "Fully approved by the civil aviation authority. Our programs meet all regulatory requirements for pilot licensing.",
    modern_fleet: "Modern Fleet",
    modern_fleet_desc: "Glass-cockpit aircraft maintained to the highest standards. Regular inspections ensure safety and availability.",
    efficient_training: "Efficient Training",
    efficient_training_desc: "Structured progression with clear milestones. Integrated digital tracking keeps you informed of your progress at every stage.",
    portal_access: "Academy Portal Access",
    portal_access_desc: "Select your portal to continue.",
    student_portal: "Student Portal",
    staff_access: "Staff Access",
    administration: "Administration",
    programs: "Programs",
    about: "About",
    why_us: "Why Us",
    student_access: "Student Access",
    nav_student: "Student Access",
    footer_onprem: "100% On-Premise",
    footer_languages: "EN | FR | العربية",
    footer_copyright: "Masterly Air Academy. All rights reserved.",
  },
  fr: {
    app_name: "Masterly Air Academy",
    tagline: "Organisme de Formation Agree",
    hero_title: "Votre Carriere Aeronautique Commence Ici",
    hero_desc: "Masterly Air Academy offre une formation au pilotage de classe mondiale avec une flotte moderne, des instructeurs experimentes et un programme rigoureux concu pour produire des pilotes surs, competents et professionnels.",
    explore_programs: "Explorer les Programmes",
    contact_us: "Contactez-Nous",
    programs_title: "Programmes de Formation",
    programs_subtitle: "Choisissez Votre Voie",
    programs_desc: "Des programmes structures depuis votre premier vol de decouverte jusqu'a la certification de ligne. Chaque programme suit un programme rigoureux et approuve.",
    about_title: "A propos de l'Academie",
    about_heading: "Former des Pilotes au Plus Haut Niveau",
    about_p1: "Masterly Air Academy est un Organisme de Formation Agree (ATO) dedie a la production de pilotes qui repondent et depassent les normes de l'industrie. Notre approche structuree combine un enseignement theorique rigoureux avec une formation pratique approfondie au pilotage.",
    about_p2: "Nous exploitons une flotte moderne d'avions monomoteurs et multimoteurs, soutenue par des instructeurs experimentes qui apportent des milliers d'heures d'experience de vol reelle a chaque lecon.",
    about_p3: "De votre premier vol decouverte a votre licence de pilote de ligne, chaque etape de votre parcours est suivie, evaluee et soutenue grace a notre systeme integre de gestion de la formation.",
    why_us_title: "Pourquoi Masterly Air Academy",
    why_us_subtitle: "Construite pour une Formation Serieuse",
    ato_certified: "ATO Certifiee",
    ato_certified_desc: "Entierement approuvee par l'autorite de l'aviation civile. Nos programmes repondent a toutes les exigences reglementaires pour les licences de pilote.",
    modern_fleet: "Flotte Moderne",
    modern_fleet_desc: "Avions a cockpits numeriques maintenus aux normes les plus elevees. Des inspections regulieres garantissent la securite et la disponibilite.",
    efficient_training: "Formation Efficace",
    efficient_training_desc: "Progression structuree avec des jalons clairs. Un suivi numerique integre vous tient informe de votre progression a chaque etape.",
    portal_access: "Acces au Portail de l'Academie",
    portal_access_desc: "Selectionnez votre portail pour continuer.",
    student_portal: "Portail Etudiant",
    staff_access: "Acces Personnel",
    administration: "Administration",
    programs: "Programmes",
    about: "A propos",
    why_us: "Pourquoi Nous",
    student_access: "Acces Etudiant",
    nav_student: "Acces Etudiant",
    footer_onprem: "100% Sur Site",
    footer_languages: "EN | FR | العربية",
    footer_copyright: "Masterly Air Academy. Tous droits reserves.",
  },
  ar: {
    app_name: "أكاديمية ماسترلي للطيران",
    tagline: "منظمة تدريب معتمدة",
    hero_title: "مسيرتك المهنية في الطيران تبدأ هنا",
    hero_desc: "تقدم أكاديمية ماسترلي للطيران تدريباً على الطيران بمستوى عالمي مع أسطول حديث ومدربين ذوي خبرة ومنهج صارم مصمم لتخريج طيارين أكفاء ومحترفين وآمنين.",
    explore_programs: "استكشاف البرامج",
    contact_us: "اتصل بنا",
    programs_title: "برامج التدريب",
    programs_subtitle: "اختر مسارك",
    programs_desc: "برامج منظمة من أول رحلة استكشافية إلى شهادة الطيار التجاري. كل برنامج يتبع منهجاً صارماً ومعتمداً.",
    about_title: "عن الأكاديمية",
    about_heading: "تدريب الطيارين بأعلى المعايير",
    about_p1: "أكاديمية ماسترلي للطيران هي منظمة تدريب معتمدة (ATO) مكرسة لتخريج طيارين يلبون ويتجاوزون معايير الصناعة. يجمع نهجنا المنظم بين التعليم النظري الصارم والتدريب العملي المكثف على الطيران.",
    about_p2: "نشغل أسطولاً حديثاً من الطائرات أحادية ومتعددة المحركات، مدعوماً بمدربين ذوي خبرة يجلبون آلاف الساعات من تجربة الطيران الحقيقية إلى كل درس.",
    about_p3: "من أول رحلة تجريبية إلى رخصة طيار النقل الجوي، يتم تتبع كل خطوة في رحلتك وتقييمها ودعمها من خلال نظام إدارة التدريب المتكامل لدينا.",
    why_us_title: "لماذا أكاديمية ماسترلي للطيران",
    why_us_subtitle: "مبنية للتدريب الجاد",
    ato_certified: "معتمدة ATO",
    ato_certified_desc: "معتمدة بالكامل من قبل سلطة الطيران المدني. برامجنا تلبي جميع المتطلبات التنظيمية لرخص الطيارين.",
    modern_fleet: "أسطول حديث",
    modern_fleet_desc: "طائرات ذات قمرة قيادة زجاجية تتم صيانتها وفق أعلى المعايير. تضمن عمليات التفتيش المنتظمة السلامة والتوفر.",
    efficient_training: "تدريب فعال",
    efficient_training_desc: "تقدم منظم مع مراحل واضحة. التتبع الرقمي المتكامل يبقيك على اطلاع بتقدمك في كل مرحلة.",
    portal_access: "الوصول إلى بوابة الأكاديمية",
    portal_access_desc: "اختر بوابتك للمتابعة.",
    student_portal: "بوابة الطالب",
    staff_access: "دخول الموظفين",
    administration: "الإدارة",
    programs: "البرامج",
    about: "عن الأكاديمية",
    why_us: "لماذا نحن",
    student_access: "دخول الطلاب",
    nav_student: "دخول الطلاب",
    footer_onprem: "١٠٠٪ على الخادم المحلي",
    footer_languages: "EN | FR | العربية",
    footer_copyright: "أكاديمية ماسترلي للطيران. جميع الحقوق محفوظة.",
  },
};

function getCookie(name: string): string {
  if (typeof document === "undefined") {
    if (typeof window !== "undefined" && window.location) {
      const path = window.location.pathname;
      const seg = path.split("/").filter(Boolean)[0];
      if (seg === "fr" || seg === "ar") return seg;
    }
    return "en";
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  if (match) return decodeURIComponent(match[1]);
  const path = window.location.pathname;
  const seg = path.split("/").filter(Boolean)[0];
  if (seg === "fr" || seg === "ar") return seg;
  return "en";
}

export function useTranslation() {
  const initialLocale = getCookie("locale");
  const [locale, setLocale] = useState(initialLocale);
  const [t, setT] = useState<Record<string, any>>(translations[initialLocale] || translations.en);

  useEffect(() => {
    const loc = getCookie("locale") || "en";
    if (loc !== locale) {
      setLocale(loc);
      setT(translations[loc] || translations.en);
    }
  }, []);

  const switchTo = (code: string) => {
    document.cookie = `locale=${code};path=/;max-age=${365 * 24 * 60 * 60}`;
    setLocale(code);
    setT(translations[code] || translations.en);
  };

  return { t, locale, switchTo };
}
