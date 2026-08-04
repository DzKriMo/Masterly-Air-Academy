"""
Seed command to populate subjects, modules, and lessons for all programs
(PPL, CPL, IR, MEP, MCC) following EASA syllabus structure.
"""
from django.core.management.base import BaseCommand


PROGRAMS = {
    'PPL': {
        'subjects': [
            {
                'code': 'PPL-AL',
                'title_en': 'Air Law and ATC Procedures',
                'title_fr': 'Droit aérien et procédures ATC',
                'title_ar': 'قانون الجو وإجراءات المراقبة الجوية',
                'modules': [
                    {
                        'title': 'International & National Aviation Law',
                        'title_fr': 'Droit aérien international et national',
                        'title_ar': 'قانون الطيران الدولي والوطني',
                        'lessons': [
                            {'lesson_no': 1, 'title': 'ICAO and International Conventions', 'content': 'The Chicago Convention, ICAO structure, annexes, and SARPs.'},
                            {'lesson_no': 2, 'title': 'National Aviation Authority & Regulations', 'content': 'Role of the CAA/DGAC, national aviation law, licensing requirements.'},
                            {'lesson_no': 3, 'title': 'Rules of the Air', 'content': 'Visual Flight Rules (VFR), right-of-way, lights, signals, and avoidance of collisions.'},
                        ]
                    },
                    {
                        'title': 'Airspace & ATC Procedures',
                        'title_fr': 'Espace aérien et procédures ATC',
                        'title_ar': 'المجال الجوي وإجراءات المراقبة',
                        'lessons': [
                            {'lesson_no': 4, 'title': 'Airspace Classification', 'content': 'Classes A through G airspace, controlled vs uncontrolled, restricted areas.'},
                            {'lesson_no': 5, 'title': 'ATC Clearances & Communications', 'content': 'Standard phraseology, clearance delivery, readback requirements.'},
                            {'lesson_no': 6, 'title': 'Aerodrome Operations', 'content': 'Circuit patterns, runway markings, taxi procedures, SIGMET/AIRMET.'},
                        ]
                    },
                ]
            },
            {
                'code': 'PPL-AGK',
                'title_en': 'Aircraft General Knowledge',
                'title_fr': 'Connaissances générales des aéronefs',
                'title_ar': 'المعرفة العامة بالطائرات',
                'modules': [
                    {
                        'title': 'Airframe & Systems',
                        'title_fr': 'Cellule et systèmes',
                        'title_ar': 'هيكل الطائرة وأنظمتها',
                        'lessons': [
                            {'lesson_no': 1, 'title': 'Aircraft Structure', 'content': 'Fuselage, wings, empennage, landing gear, flight controls.'},
                            {'lesson_no': 2, 'title': 'Powerplant', 'content': 'Piston engines, four-stroke cycle, carburetion vs fuel injection, engine instruments.'},
                            {'lesson_no': 3, 'title': 'Electrical System', 'content': 'Battery, alternator/generator, bus bars, circuit breakers, avionics power.'},
                            {'lesson_no': 4, 'title': 'Fuel System', 'content': 'Fuel tanks, pumps, filters, fuel management, contamination, octane ratings.'},
                            {'lesson_no': 5, 'title': 'Hydraulic & Landing Gear', 'content': 'Hydraulic principles, brake systems, nose-wheel steering, retractable gear.'},
                            {'lesson_no': 6, 'title': 'Flight Instruments', 'content': 'Pitot-static system, altimeter, ASI, VSI, gyroscopic instruments, compass.'},
                        ]
                    },
                ]
            },
            {
                'code': 'PPL-FPP',
                'title_en': 'Flight Performance & Planning',
                'title_fr': 'Performance et préparation du vol',
                'title_ar': 'أداء الطائرة وتخطيط الرحلة',
                'modules': [
                    {
                        'title': 'Mass & Balance',
                        'title_fr': 'Masse et centrage',
                        'title_ar': 'الكتلة والتوازن',
                        'lessons': [
                            {'lesson_no': 1, 'title': 'Weight Terminology', 'content': 'BEW, MTOW, MLW, ZFW, payload. Weight limits and structural considerations.'},
                            {'lesson_no': 2, 'title': 'Center of Gravity', 'content': 'CG calculation, CG envelope, effects of CG position on stability and performance.'},
                        ]
                    },
                    {
                        'title': 'Performance',
                        'title_fr': 'Performances',
                        'title_ar': 'الأداء',
                        'lessons': [
                            {'lesson_no': 3, 'title': 'Takeoff & Landing Performance', 'content': 'Takeoff distance, landing distance, factors affecting performance (density altitude, wind, runway surface).'},
                            {'lesson_no': 4, 'title': 'Climb & Cruise Performance', 'content': 'Rate of climb, service ceiling, cruise power settings, range and endurance.'},
                        ]
                    },
                    {
                        'title': 'Flight Planning',
                        'title_fr': 'Planification du vol',
                        'title_ar': 'تخطيط الرحلة',
                        'lessons': [
                            {'lesson_no': 5, 'title': 'VFR Flight Planning', 'content': 'Route selection, alternate aerodromes, fuel planning (taxi, trip, contingency, reserve, extra).'},
                            {'lesson_no': 6, 'title': 'Navigation Log', 'content': 'Completing a navigation log, time/speed/distance calculations, fuel log.'},
                        ]
                    },
                ]
            },
            {
                'code': 'PPL-HPL',
                'title_en': 'Human Performance & Limitations',
                'title_fr': 'Performance humaine et limites',
                'title_ar': 'الأداء البشري وحدوده',
                'modules': [
                    {
                        'title': 'Human Factors',
                        'title_fr': 'Facteurs humains',
                        'title_ar': 'العوامل البشرية',
                        'lessons': [
                            {'lesson_no': 1, 'title': 'The Atmosphere & Respiration', 'content': 'Hypoxia, hyperventilation, effects of altitude on the human body.'},
                            {'lesson_no': 2, 'title': 'Vision & Hearing', 'content': 'Visual illusions, spatial disorientation, vestibular system, hearing and noise.'},
                            {'lesson_no': 3, 'title': 'Information Processing', 'content': 'Attention, perception, decision-making, situational awareness, workload management.'},
                            {'lesson_no': 4, 'title': 'Stress & Fatigue', 'content': 'Types of stress, fatigue management, circadian rhythms, sleep and alertness.'},
                        ]
                    },
                ]
            },
            {
                'code': 'PPL-MET',
                'title_en': 'Meteorology',
                'title_fr': 'Météorologie',
                'title_ar': 'الأرصاد الجوية',
                'modules': [
                    {
                        'title': 'Atmosphere & Weather',
                        'title_fr': 'Atmosphère et météo',
                        'title_ar': 'الغلاف الجوي والطقس',
                        'lessons': [
                            {'lesson_no': 1, 'title': 'The Atmosphere', 'content': 'Composition, layers (troposphere, stratosphere), ISA, pressure, density.'},
                            {'lesson_no': 2, 'title': 'Temperature & Humidity', 'content': 'Insolation, diurnal variation, adiabatic processes, stability, condensation.'},
                            {'lesson_no': 3, 'title': 'Pressure Systems', 'content': 'High and low pressure, isobars, pressure gradient, Coriolis, geostrophic wind.'},
                            {'lesson_no': 4, 'title': 'Clouds & Precipitation', 'content': 'Cloud types and classification, formation, precipitation types (rain, snow, hail).'},
                            {'lesson_no': 5, 'title': 'Visibility & Fog', 'content': 'Visibility, RVR, fog types (radiation, advection, frontal), mist, haze.'},
                            {'lesson_no': 6, 'title': 'Air Masses & Fronts', 'content': 'Air mass classification, warm/cold/occluded fronts, associated weather.'},
                            {'lesson_no': 7, 'title': 'Hazards', 'content': 'Thunderstorms, icing, turbulence, wind shear, microbursts, mountain waves.'},
                            {'lesson_no': 8, 'title': 'Meteorological Information', 'content': 'METAR, TAF, SIGMET, AIRMET, weather charts, GAFOR, SWC.'},
                        ]
                    },
                ]
            },
            {
                'code': 'PPL-NAV',
                'title_en': 'Navigation',
                'title_fr': 'Navigation',
                'title_ar': 'الملاحة',
                'modules': [
                    {
                        'title': 'General Navigation',
                        'title_fr': 'Navigation générale',
                        'title_ar': 'الملاحة العامة',
                        'lessons': [
                            {'lesson_no': 1, 'title': 'The Earth', 'content': 'Shape, great circles, rhumb lines, latitude/longitude, time zones, UTC.'},
                            {'lesson_no': 2, 'title': 'Magnetism & Compasses', 'content': 'Magnetic variation and deviation, compass errors, true/magnetic/compass headings.'},
                            {'lesson_no': 3, 'title': 'Charts', 'content': 'VFR charts, map projections (Mercator, Lambert), scale, symbols, elevation.'},
                            {'lesson_no': 4, 'title': 'Dead Reckoning', 'content': 'Heading, TAS, GS, wind triangle, drift correction, ETA calculations.'},
                            {'lesson_no': 5, 'title': 'Radio Navigation', 'content': 'NDB/ADF, VOR, DME principles and usage, VOR radials and tracking.'},
                            {'lesson_no': 6, 'title': 'GNSS/GPS', 'content': 'GPS principles, RAIM, WAAS/EGNOS, waypoints, direct-to navigation.'},
                        ]
                    },
                ]
            },
            {
                'code': 'PPL-OPS',
                'title_en': 'Operational Procedures',
                'title_fr': 'Procédures opérationnelles',
                'title_ar': 'الإجراءات التشغيلية',
                'modules': [
                    {
                        'title': 'Flight Operations',
                        'title_fr': 'Opérations de vol',
                        'title_ar': 'عمليات الطيران',
                        'lessons': [
                            {'lesson_no': 1, 'title': 'Pre-flight Procedures', 'content': 'Documentation check (AIP, NOTAM), weather briefing, walk-around inspection.'},
                            {'lesson_no': 2, 'title': 'Normal Operations', 'content': 'Checklist usage, standard operating procedures (SOPs), standard calls.'},
                            {'lesson_no': 3, 'title': 'Emergency Procedures', 'content': 'Engine failure, fire, electrical failure, emergency landing, ELT, distress signals.'},
                            {'lesson_no': 4, 'title': 'Security & Safety', 'content': 'Aviation security, safety management, accident/incident reporting, safety culture.'},
                        ]
                    },
                ]
            },
            {
                'code': 'PPL-POF',
                'title_en': 'Principles of Flight',
                'title_fr': 'Principes du vol',
                'title_ar': 'مبادئ الطيران',
                'modules': [
                    {
                        'title': 'Aerodynamics',
                        'title_fr': 'Aérodynamique',
                        'title_ar': 'الديناميكا الهوائية',
                        'lessons': [
                            {'lesson_no': 1, 'title': 'Forces in Flight', 'content': 'Lift, weight, thrust, drag. Bernoulli principle, angle of attack, stall.'},
                            {'lesson_no': 2, 'title': 'Aircraft Stability', 'content': 'Static and dynamic stability, longitudinal/lateral/directional stability.'},
                            {'lesson_no': 3, 'title': 'Controls & Manoeuvres', 'content': 'Primary and secondary flight controls, turns, climbs, descents, slow flight.'},
                            {'lesson_no': 4, 'title': 'Stall & Spin Awareness', 'content': 'Stall recognition and recovery, spin entry and recovery, incipient spin.'},
                        ]
                    },
                ]
            },
            {
                'code': 'PPL-COM',
                'title_en': 'Communications',
                'title_fr': 'Communications',
                'title_ar': 'الاتصالات',
                'modules': [
                    {
                        'title': 'VFR Communications',
                        'title_fr': 'Communications VFR',
                        'title_ar': 'اتصالات VFR',
                        'lessons': [
                            {'lesson_no': 1, 'title': 'Radio Theory', 'content': 'VHF radio, frequencies, wave propagation, line-of-sight limitations.'},
                            {'lesson_no': 2, 'title': 'Standard Phraseology', 'content': 'ICAO standard phraseology, alphabet, numbers, standard words and phrases.'},
                            {'lesson_no': 3, 'title': 'ATC Communication Procedures', 'content': 'Initial call, readback, position reports, frequency change, emergency comms (7700/7600/7500).'},
                        ]
                    },
                ]
            },
        ]
    },
    'CPL': {
        'subjects': [
            {
                'code': 'CPL-AL',
                'title_en': 'Air Law (CPL)',
                'title_fr': 'Droit aérien (CPL)',
                'title_ar': 'قانون الجو (CPL)',
                'modules': [
                    {
                        'title': 'Commercial Aviation Law',
                        'title_fr': 'Droit aérien commercial',
                        'title_ar': 'قانون الطيران التجاري',
                        'lessons': [
                            {'lesson_no': 1, 'title': 'Commercial Operations Regulations', 'content': 'AOC requirements, operational manuals, commercial pilot privileges and limitations.'},
                            {'lesson_no': 2, 'title': 'Air Operator Certification', 'content': 'Part-CAT, Part-NCC, Part-SPO regulations, operator responsibilities.'},
                            {'lesson_no': 3, 'title': 'Flight Time Limitations', 'content': 'FTL schemes, duty periods, rest requirements, fatigue risk management.'},
                        ]
                    },
                ]
            },
            {
                'code': 'CPL-AGK',
                'title_en': 'Aircraft General Knowledge (CPL)',
                'title_fr': 'Connaissances générales des aéronefs (CPL)',
                'title_ar': 'المعرفة العامة بالطائرات (CPL)',
                'modules': [
                    {
                        'title': 'Advanced Systems',
                        'title_fr': 'Systèmes avancés',
                        'title_ar': 'الأنظمة المتقدمة',
                        'lessons': [
                            {'lesson_no': 1, 'title': 'Advanced Powerplant', 'content': 'Constant-speed propellers, turbocharging, FADEC, turbine engines intro.'},
                            {'lesson_no': 2, 'title': 'Pressurization & Environmental', 'content': 'Cabin pressurization, air conditioning, oxygen systems, ice protection.'},
                            {'lesson_no': 3, 'title': 'Autopilot & Flight Director', 'content': 'Autopilot modes, flight director, yaw damper, auto-throttle basics.'},
                        ]
                    },
                ]
            },
            {
                'code': 'CPL-FPP',
                'title_en': 'Flight Performance & Planning (CPL)',
                'title_fr': 'Performance et préparation du vol (CPL)',
                'title_ar': 'أداء الطائرة وتخطيط الرحلة (CPL)',
                'modules': [
                    {
                        'title': 'Advanced Performance',
                        'title_fr': 'Performances avancées',
                        'title_ar': 'الأداء المتقدم',
                        'lessons': [
                            {'lesson_no': 1, 'title': 'Performance Class Analysis', 'content': 'Class A/B performance, accelerate-stop distance, balanced field length.'},
                            {'lesson_no': 2, 'title': 'Advanced Flight Planning', 'content': 'Commercial flight planning, cost index, ETOPS basics, re-dispatch.'},
                        ]
                    },
                ]
            },
            {
                'code': 'CPL-HPL',
                'title_en': 'Human Performance (CPL)',
                'title_fr': 'Performance humaine (CPL)',
                'title_ar': 'الأداء البشري (CPL)',
                'modules': [
                    {
                        'title': 'Advanced Human Factors',
                        'title_fr': 'Facteurs humains avancés',
                        'title_ar': 'العوامل البشرية المتقدمة',
                        'lessons': [
                            {'lesson_no': 1, 'title': 'Crew Resource Management', 'content': 'CRM principles, communication, leadership, decision-making, threat and error management (TEM).'},
                            {'lesson_no': 2, 'title': 'Automation & Human Performance', 'content': 'Automation dependency, mode confusion, monitoring skills, manual handling.'},
                        ]
                    },
                ]
            },
            {
                'code': 'CPL-MET',
                'title_en': 'Meteorology (CPL)',
                'title_fr': 'Météorologie (CPL)',
                'title_ar': 'الأرصاد الجوية (CPL)',
                'modules': [
                    {
                        'title': 'Advanced Meteorology',
                        'title_fr': 'Météorologie avancée',
                        'title_ar': 'الأرصاد الجوية المتقدمة',
                        'lessons': [
                            {'lesson_no': 1, 'title': 'Global Climatology', 'content': 'Global circulation, jet streams, ITCZ, monsoon, regional weather patterns.'},
                            {'lesson_no': 2, 'title': 'High-Altitude Weather', 'content': 'Tropopause, clear air turbulence (CAT), jet stream hazards, contrails.'},
                            {'lesson_no': 3, 'title': 'Severe Weather Analysis', 'content': 'Tropical cyclones, severe icing, volcanic ash, space weather.'},
                        ]
                    },
                ]
            },
            {
                'code': 'CPL-NAV',
                'title_en': 'Navigation (CPL)',
                'title_fr': 'Navigation (CPL)',
                'title_ar': 'الملاحة (CPL)',
                'modules': [
                    {
                        'title': 'Advanced Navigation',
                        'title_fr': 'Navigation avancée',
                        'title_ar': 'الملاحة المتقدمة',
                        'lessons': [
                            {'lesson_no': 1, 'title': 'Advanced Radio Navigation', 'content': 'DME arcs, VOR/DME area navigation, ILS principles and categories.'},
                            {'lesson_no': 2, 'title': 'RNAV & RNP', 'content': 'PBN concepts, RNAV 5/1, RNP APCH, LNAV/VNAV, LPV approaches.'},
                        ]
                    },
                ]
            },
        ]
    },
    'IR': {
        'subjects': [
            {
                'code': 'IR-INST',
                'title_en': 'Instrumentation',
                'title_fr': 'Instrumentation',
                'title_ar': 'أجهزة القياس',
                'modules': [
                    {
                        'title': 'Flight Instruments',
                        'title_fr': 'Instruments de vol',
                        'title_ar': 'أجهزة الطيران',
                        'lessons': [
                            {'lesson_no': 1, 'title': 'Pitot-Static Instruments Deep Dive', 'content': 'Altimeter errors (temperature, pressure), ASI errors (compressibility, density).'},
                            {'lesson_no': 2, 'title': 'Gyroscopic Instruments', 'content': 'Attitude indicator, heading indicator, turn coordinator — principles, errors, power sources.'},
                            {'lesson_no': 3, 'title': 'EFIS & Glass Cockpit', 'content': 'PFD, ND, EICAS/ECAM, AHRS, ADC, electronic instrument philosophy.'},
                        ]
                    },
                    {
                        'title': 'Radio Navigation Aids',
                        'title_fr': 'Aides de radionavigation',
                        'title_ar': 'مساعدات الملاحة الراديوية',
                        'lessons': [
                            {'lesson_no': 4, 'title': 'VOR & DME Advanced', 'content': 'VOR service volumes, cone of confusion, DME slant range, VOR/DME RNAV.'},
                            {'lesson_no': 5, 'title': 'ILS', 'content': 'Localizer, glideslope, marker beacons, ILS categories I/II/III, decision height.'},
                            {'lesson_no': 6, 'title': 'GNSS for IFR', 'content': 'GPS/GLONASS/Galileo, RAIM prediction, SBAS, GBAS, RNP approaches.'},
                        ]
                    },
                ]
            },
            {
                'code': 'IR-IFP',
                'title_en': 'IFR Procedures',
                'title_fr': 'Procédures IFR',
                'title_ar': 'إجراءات الطيران الآلي',
                'modules': [
                    {
                        'title': 'IFR Flight Procedures',
                        'title_fr': 'Procédures de vol IFR',
                        'title_ar': 'إجراءات الطيران IFR',
                        'lessons': [
                            {'lesson_no': 1, 'title': 'Departure Procedures', 'content': 'SID types, obstacle clearance, climb gradients, noise abatement.'},
                            {'lesson_no': 2, 'title': 'En-route IFR', 'content': 'Airways, waypoints, minimum en-route altitude (MEA), MOCA, MORA, grid MORA.'},
                            {'lesson_no': 3, 'title': 'Arrival & Approach', 'content': 'STARs, initial/intermediate/final approach, missed approach, circling, visual approach.'},
                            {'lesson_no': 4, 'title': 'Holding Procedures', 'content': 'Standard holding pattern, entries (direct/parallel/teardrop), holding speeds, timing.'},
                        ]
                    },
                    {
                        'title': 'Instrument Flight Techniques',
                        'title_fr': 'Techniques de vol aux instruments',
                        'title_ar': 'تقنيات الطيران الآلي',
                        'lessons': [
                            {'lesson_no': 5, 'title': 'Basic Instrument Flight', 'content': 'Instrument scan (T-scan, radial scan), attitude flying, instrument cross-check.'},
                            {'lesson_no': 6, 'title': 'Partial Panel', 'content': 'Failed attitude indicator, failed heading indicator, alternate instrument scan patterns.'},
                            {'lesson_no': 7, 'title': 'Unusual Attitudes', 'content': 'Recognition and recovery from unusual attitudes on instruments.'},
                        ]
                    },
                ]
            },
            {
                'code': 'IR-COM',
                'title_en': 'IFR Communications',
                'title_fr': 'Communications IFR',
                'title_ar': 'اتصالات IFR',
                'modules': [
                    {
                        'title': 'IFR Radio Procedures',
                        'title_fr': 'Procédures radio IFR',
                        'title_ar': 'إجراءات الراديو IFR',
                        'lessons': [
                            {'lesson_no': 1, 'title': 'IFR Phraseology', 'content': 'IFR clearance readback, position reports, level changes, approach clearances.'},
                            {'lesson_no': 2, 'title': 'Emergency & Abnormal Comms', 'content': 'Radio failure procedures (NORDO), emergency declarations, SELCAL.'},
                        ]
                    },
                ]
            },
        ]
    },
    'MEP': {
        'subjects': [
            {
                'code': 'MEP-AGK',
                'title_en': 'Multi-Engine Aircraft General Knowledge',
                'title_fr': 'Connaissances générales des aéronefs multimoteurs',
                'title_ar': 'المعرفة العامة بالطائرات متعددة المحركات',
                'modules': [
                    {
                        'title': 'Multi-Engine Systems',
                        'title_fr': 'Systèmes multimoteurs',
                        'title_ar': 'أنظمة الطائرات متعددة المحركات',
                        'lessons': [
                            {'lesson_no': 1, 'title': 'Multi-Engine Powerplant', 'content': 'Turbocharged and supercharged engines, intercooler, constant-speed propellers.'},
                            {'lesson_no': 2, 'title': 'Propeller Systems', 'content': 'Feathering, unfeathering, propeller synchronization and synchrophasing.'},
                            {'lesson_no': 3, 'title': 'Fuel & Electrical Systems', 'content': 'Cross-feed, fuel management, dual electrical systems, bus tie.'},
                        ]
                    },
                    {
                        'title': 'Asymmetric Flight',
                        'title_fr': 'Vol asymétrique',
                        'title_ar': 'الطيران غير المتماثل',
                        'lessons': [
                            {'lesson_no': 4, 'title': 'Engine Failure Aerodynamics', 'content': 'Vmc (minimum control speed), critical engine, thrust/drag asymmetry, yaw and roll moments.'},
                            {'lesson_no': 5, 'title': 'Engine Failure Procedures', 'content': 'Drills: identify, verify, feather, secure. Single-engine go-around, SE climb performance.'},
                        ]
                    },
                    {
                        'title': 'Performance',
                        'title_fr': 'Performances',
                        'title_ar': 'الأداء',
                        'lessons': [
                            {'lesson_no': 6, 'title': 'Multi-Engine Performance', 'content': 'Accelerate-stop, accelerate-go, SE climb gradient, obstacle clearance, WAT limits.'},
                            {'lesson_no': 7, 'title': 'Weight & Balance (ME)', 'content': 'Zero fuel weight, ME loading considerations, CG shift with fuel burn.'},
                        ]
                    },
                ]
            },
        ]
    },
    'MCC': {
        'subjects': [
            {
                'code': 'MCC-CRM',
                'title_en': 'Crew Resource Management & Multi-Crew Cooperation',
                'title_fr': 'CRM et coopération multi-équipage',
                'title_ar': 'إدارة موارد الطاقم والتعاون متعدد الأفراد',
                'modules': [
                    {
                        'title': 'CRM Fundamentals',
                        'title_fr': 'Fondamentaux CRM',
                        'title_ar': 'أساسيات CRM',
                        'lessons': [
                            {'lesson_no': 1, 'title': 'CRM Principles', 'content': 'History of CRM, SHELL model, Reason model (Swiss cheese), safety culture.'},
                            {'lesson_no': 2, 'title': 'Communication & Teamwork', 'content': 'Briefing/debriefing, assertiveness, active listening, conflict resolution.'},
                            {'lesson_no': 3, 'title': 'Leadership & Followership', 'content': 'Leadership styles, authority gradient, crew synergy, followership roles.'},
                        ]
                    },
                    {
                        'title': 'Threat & Error Management',
                        'title_fr': 'Gestion des menaces et erreurs',
                        'title_ar': 'إدارة التهديدات والأخطاء',
                        'lessons': [
                            {'lesson_no': 4, 'title': 'TEM Framework', 'content': 'Threats, errors, undesired aircraft states, countermeasures, TEM model application.'},
                            {'lesson_no': 5, 'title': 'Decision Making & Problem Solving', 'content': 'FORDEC, DESIDE, DECIDE models, risk assessment, time-critical decisions.'},
                        ]
                    },
                    {
                        'title': 'Multi-Crew Operations',
                        'title_fr': 'Opérations multi-équipage',
                        'title_ar': 'العمليات متعددة الأفراد',
                        'lessons': [
                            {'lesson_no': 6, 'title': 'Standard Operating Procedures', 'content': 'PF/PM roles, standard calls, checklists (normal/abnormal/emergency).'},
                            {'lesson_no': 7, 'title': 'Workload Management', 'content': 'Task prioritization, automation management, fatigue countermeasures.'},
                            {'lesson_no': 8, 'title': 'Monitoring & Cross-Checking', 'content': 'Active monitoring, FMA verification, cross-check techniques, error trapping.'},
                            {'lesson_no': 9, 'title': 'Surprise & Startle Effect', 'content': 'Startle reflex, resilience, stress inoculation, maintaining control under pressure.'},
                        ]
                    },
                ]
            },
        ]
    },
}


class Command(BaseCommand):
    help = 'Seed subjects, modules, and lessons for all training programs'

    def handle(self, *args, **options):
        from apps.ground_training.models import Subject, Module, ModuleLesson
        created_subjects = 0
        created_modules = 0
        created_lessons = 0

        for program_code, program_data in PROGRAMS.items():
            for subj_data in program_data['subjects']:
                subject, subj_created = Subject.objects.get_or_create(
                    code=subj_data['code'],
                    defaults={
                        'title_en': subj_data['title_en'],
                        'title_fr': subj_data.get('title_fr', subj_data['title_en']),
                        'title_ar': subj_data.get('title_ar', subj_data['title_en']),
                        'program': program_code,
                        'total_hours': subj_data.get('total_hours', 30),
                    }
                )
                if subj_created:
                    created_subjects += 1

                for mod_data in subj_data['modules']:
                    module, mod_created = Module.objects.get_or_create(
                        subject=subject,
                        title=mod_data['title'],
                        defaults={
                            'title_fr': mod_data.get('title_fr', mod_data['title']),
                            'title_ar': mod_data.get('title_ar', mod_data['title']),
                            'description': mod_data.get('title', ''),
                            'duration': mod_data.get('duration', 10),
                            'order': mod_data.get('order', 1),
                        }
                    )
                    if mod_created:
                        created_modules += 1

                    for les_data in mod_data['lessons']:
                        lesson, les_created = ModuleLesson.objects.get_or_create(
                            module=module,
                            lesson_no=les_data['lesson_no'],
                            defaults={
                                'title': les_data['title'],
                                'content': les_data['content'],
                            }
                        )
                        if les_created:
                            created_lessons += 1

        self.stdout.write(self.style.SUCCESS(
            f'Seeded: {created_subjects} subjects, {created_modules} modules, {created_lessons} lessons'
        ))
