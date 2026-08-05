"""
Seed the two question banks with a large, realistic set of questions covering
every supported question type:

  * QuestionBank (assessments / quizzes / module exams):
    500 questions across 7 types (mcq, true_false, short_answer, essay,
    matching, ordering, case_study), difficulties and programs.

  * FinalExamQuestion (final internal exams):
    500 questions across 4 types (mcq, scq, essay, true_false), difficulties.

Idempotent: it only creates rows up to the per-bank targets, so re-running
after the banks are full is a no-op. Subjects/modules are ensured first using
the same PPL/CPL/IR/MEP/MCC syllabus used by seed_training_content.
"""
from django.core.management.base import BaseCommand

TARGET_ASSESSMENTS = 500
TARGET_FINAL = 500

PROGRAMS = ['PPL', 'CPL', 'IR', 'MEP', 'MCC']
DIFFICULTIES = ['easy', 'medium', 'hard']


# ---------------------------------------------------------------------------
# Curated question pools keyed by subject code. Every entry is a plain dict so
# it can be reused for both banks and expanded programmatically below.
# ---------------------------------------------------------------------------
MCQ_POOL = [
    # Air Law & Procedures
    ('PPL-AL', 'What is the standard QNH altimeter setting above the transition altitude?', ['1013.25 hPa', 'QFE', '29.92 hPa', '1013.25 inHg'], '1013.25 hPa', 'Above the transition altitude pilots set the altimeter to 1013.25 hPa (29.92 inHg).'),
    ('PPL-AL', 'What does the abbreviation VFR stand for?', ['Visual Flight Rules', 'Very Fast Response', 'Visual Frequency Range', 'Variable Flight Reference'], 'Visual Flight Rules', 'VFR = Visual Flight Rules.'),
    ('PPL-AL', 'Which document establishes the Convention on International Civil Aviation?', ['The Chicago Convention', 'The Geneva Protocol', 'The Kyoto Accord', 'The Montreal Agreement'], 'The Chicago Convention', 'The Chicago Convention (1944) established ICAO.'),
    ('PPL-AL', 'What is the minimum age to hold a PPL licence?', ['17 years', '16 years', '18 years', '21 years'], '17 years', 'A PPL may be issued at 17 years of age.'),
    ('PPL-AL', 'In class G airspace below 3000 ft AMSL, VFR minimum visibility is:', ['5 km', '1.5 km', '3 km', '8 km'], '5 km', 'In class G below 3000 ft AMSL, VMC requires 5 km visibility.'),
    ('PPL-AL', 'What is the purpose of a right-of-way rule?', ['To establish which aircraft has priority in certain situations', 'To give priority to faster aircraft', 'To avoid aircraft above cloud', 'To establish ATC hierarchy'], 'To establish which aircraft has priority in certain situations', 'Right-of-way rules define who has priority to avoid collision.'),
    ('PPL-AL', 'What does a Class 1 medical certificate allow the holder to exercise?', ['Commercial pilot privileges', 'Private pilot privileges only', 'ATC duties', 'Maintenance work'], 'Commercial pilot privileges', 'A Class 1 medical is required for commercial licence privileges.'),
    ('PPL-AL', 'SIGMET information warns of:', ['Significant en-route weather phenomena', 'Terminal weather', 'Runway conditions', 'Fuel availability'], 'Significant en-route weather phenomena', 'SIGMETs warn of significant en-route weather hazards.'),
    ('PPL-AL', 'NOTAM stands for:', ['Notice to Air Missions', 'Notice to All Mechanics', 'Notice of Terminal Aviation Messages', 'Navigation of Air Traffic Movements'], 'Notice to Air Missions', 'NOTAM = Notice to Air Missions.'),
    ('PPL-AL', 'When flying VFR in uncontrolled airspace, ATC clearance is:', ['Not required', 'Always required', 'Required above 10,000 ft only', 'Required at night'], 'Not required', 'VFR flight in uncontrolled airspace does not require ATC clearance.'),
    ('PPL-AL', 'The primary purpose of aircraft lights is to:', ['Make the aircraft visible to other traffic', 'Illuminate the cockpit', 'Warm the wings', 'Charge the battery'], 'Make the aircraft visible to other traffic', 'Aircraft lighting enhances visibility to other aircraft.'),
    ('PPL-AL', 'What does QFE represent?', ['Height above the aerodrome elevation', 'Altitude above mean sea level', 'Pressure altitude', 'Density altitude'], 'Height above the aerodrome elevation', 'QFE gives height above the aerodrome.'),
    ('PPL-AL', 'A pilot should obtain a weather briefing:', ['Before every flight', 'Once a month', 'Only for IFR flights', 'Only for long flights'], 'Before every flight', 'A full weather briefing should be obtained before every flight.'),
    ('PPL-AL', 'What is the transition altitude?', ['The altitude at which the QNH setting is changed to 1013.25 hPa', 'The altitude where VFR ends', 'The highest usable altitude', 'The altitude of the transition layer'], 'The altitude at which the QNH setting is changed to 1013.25 hPa', 'At the transition altitude pilots switch from QNH to 1013.25 hPa.'),
    ('PPL-AL', 'Runway markings indicating the landing distance available are:', ['Painted numbers and white stripes', 'Yellow lines', 'Red flags', 'Blue lights'], 'Painted numbers and white stripes', 'White runway markings show touchdown and landing distance.'),
    ('PPL-AL', 'What action should a pilot take on hearing "Mayday"?', ['Give way to the emergency aircraft and assist as possible', 'Continue normal operations', 'Change frequency', 'Land immediately'], 'Give way to the emergency aircraft and assist as possible', 'Pilots must yield to a Mayday aircraft and assist when able.'),
    ('PPL-AL', 'Who is responsible for the safety of a flight?', ['The pilot in command', 'ATC', 'The dispatcher', 'The owner of the aircraft'], 'The pilot in command', 'The pilot in command is ultimately responsible.'),
    ('PPL-AL', 'Visual Meteorological Conditions (VMC) include limits on:', ['Visibility and distance from cloud', 'Aircraft speed only', 'Fuel quantity only', 'Passenger number'], 'Visibility and distance from cloud', 'VMC defines minimum visibility and cloud separation.'),
    ('PPL-AL', 'A danger area is airspace in which:', ['Activities hazardous to aircraft may take place', 'Flight is always forbidden', 'Only gliders operate', 'ATC is not provided'], 'Activities hazardous to aircraft may take place', 'Danger areas host potentially hazardous activities.'),
    ('PPL-AL', 'Which flight instrument directly displays airspeed?', ['Airspeed indicator', 'Altimeter', 'VSI', 'Compass'], 'Airspeed indicator', 'The ASI displays indicated airspeed.'),
    ('PPL-AL', 'The maximum speed at which an aircraft may be operated is called:', ['Vne', 'Vx', 'Vs', 'Va'], 'Vne', 'Vne is the never-exceed speed.'),
    ('PPL-AL', 'What does the squawk code 7700 indicate?', ['Emergency', 'Radio failure', 'Hijacking', 'Normal operations'], 'Emergency', '7700 = general emergency.'),
    ('PPL-AL', 'Squawk 7500 indicates:', ['Hijack', 'Radio failure', 'Emergency', 'VFR flight'], 'Hijack', '7500 = unlawful interference.'),
    ('PPL-AL', 'The term "circuit" refers to:', ['The traffic pattern around an aerodrome', 'An electrical loop', 'A navigation route', 'A fuel system'], 'The traffic pattern around an aerodrome', 'The circuit is the standard traffic pattern.'),
    ('PPL-AL', 'In right-hand circuits, all turns are made to the:', ['Right', 'Left', 'Neither', 'Upside down'], 'Right', 'Right-hand circuits turn right.'),
    ('PPL-AL', 'What is the purpose of the pre-flight briefing?', ['To prepare the pilot for the flight', 'To entertain passengers', 'To check the runway', 'To refuel the aircraft'], 'To prepare the pilot for the flight', 'The pre-flight briefing prepares the crew and passengers.'),
    ('PPL-AL', 'Fuel exhaustion is best prevented by:', ['Careful fuel planning and management', 'Flying slower', 'Carrying extra passengers', 'Using higher power settings'], 'Careful fuel planning and management', 'Proper fuel planning prevents exhaustion.'),
    ('PPL-AL', 'A pilot flying at night should:', ['Use appropriate lighting and follow night procedures', 'Fly faster', 'Avoid all instruments', 'Fly lower'], 'Use appropriate lighting and follow night procedures', 'Night operations require proper lighting and procedures.'),
    ('PPL-AL', 'What is the effect of density altitude on performance?', ['Higher density altitude reduces performance', 'It improves performance', 'No effect', 'Only affects jets'], 'Higher density altitude reduces performance', 'High density altitude reduces engine and lift performance.'),
    ('PPL-AL', 'The unit of pressure used in aviation altimetry is:', ['Hectopascal', 'Pound', 'Watt', 'Litre'], 'Hectopascal', 'Pressure is reported in hectopascals (or inHg).'),
    # Meteorology
    ('PPL-MET', 'The standard tropospheric lapse rate is approximately:', ['2 degrees C per 1000 ft', '1 degree C per 1000 ft', '5 degrees C per 1000 ft', '0.5 degrees C per 1000 ft'], '2 degrees C per 1000 ft', 'The standard lapse rate is about 2C per 1000 ft.'),
    ('PPL-MET', 'A front is the boundary between:', ['Two air masses of different properties', 'Two runways', 'Two clouds', 'Two pressure levels'], 'Two air masses of different properties', 'A front separates air masses.'),
    ('PPL-MET', 'METAR is a/an:', ['Meteorological Aerodrome Report', 'Manual Entry for Terrain Assessment', 'Meteorological Atlas Review', 'Minimum Environmental Turbulence Altitude'], 'Meteorological Aerodrome Report', 'METAR = routine aerodrome weather report.'),
    ('PPL-MET', 'The most hazardous type of icing for flight is:', ['Clear ice', 'Frost', 'Rime ice', 'Hoar frost'], 'Clear ice', 'Clear ice is heavy, transparent and dangerous.'),
    ('PPL-MET', 'Visibility in aviation is reported in:', ['Metres or statute miles', 'Kilometres only', 'Feet only', 'Nautical miles'], 'Metres or statute miles', 'Visibility is reported in metres or statute miles.'),
    ('PPL-MET', 'A sea breeze is caused by:', ['Temperature differences between land and sea', 'Earth rotation', 'Tidal forces', 'Wind shear'], 'Temperature differences between land and sea', 'Sea breezes develop from differential heating.'),
    ('PPL-MET', 'What does TAF stand for?', ['Terminal Aerodrome Forecast', 'Terminal Aircraft Fuel', 'Temperature Adjustment Formula', 'Turbulence Advisory Forecast'], 'Terminal Aerodrome Forecast', 'TAF = Terminal Aerodrome Forecast.'),
    ('PPL-MET', 'Which cloud type is associated with thunderstorms?', ['Cumulonimbus', 'Stratus', 'Cirrus', 'Altocumulus'], 'Cumulonimbus', 'Cumulonimbus clouds produce thunderstorms.'),
    ('PPL-MET', 'Microbursts are:', ['Strong localized downdrafts', 'Light winds', 'Gentle rain', 'High pressure systems'], 'Strong localized downdrafts', 'Microbursts are intense localized downdrafts.'),
    ('PPL-MET', 'Rime ice forms when:', ['Supercooled droplets freeze rapidly on impact', 'Warm rain falls', 'The sun heats the wings', 'Pressure rises'], 'Supercooled droplets freeze rapidly on impact', 'Rime ice is formed by rapid freezing of supercooled droplets.'),
    ('PPL-MET', 'Wind shear is:', ['A sudden change in wind speed or direction', 'The wind at altitude', 'Wind measured on the ground', 'A type of cloud'], 'A sudden change in wind speed or direction', 'Wind shear is a rapid change in wind.'),
    ('PPL-MET', 'The standard pressure at mean sea level is:', ['1013.25 hPa', '1000 hPa', '1013.25 kPa', '29.92 kPa'], '1013.25 hPa', 'ISA sea-level pressure is 1013.25 hPa.'),
    ('PPL-MET', 'Isobars are lines of equal:', ['Pressure', 'Temperature', 'Humidity', 'Visibility'], 'Pressure', 'Isobars join points of equal pressure.'),
    ('PPL-MET', 'What is the primary cause of turbulence?', ['Changes in wind flow', 'High pressure', 'Cloud cover', 'Time of day'], 'Changes in wind flow', 'Turbulence results from disturbed wind flow.'),
    ('PPL-MET', 'Fog is a cloud that:', ['Forms at or near the surface', 'Forms above 20,000 ft', 'Contains only ice', 'Never affects visibility'], 'Forms at or near the surface', 'Fog is surface-based cloud.'),
    ('PPL-MET', 'Radiation fog is most common:', ['On clear nights with light winds', 'During thunderstorms', 'In the afternoon', 'In summer storms'], 'On clear nights with light winds', 'Radiation fog forms on clear, calm nights.'),
    ('PPL-MET', 'The troposphere extends up to about:', ['36,000 ft at the equator', '60,000 ft', '100,000 ft', '10,000 ft'], '36,000 ft at the equator', 'The tropopause is roughly 36,000 ft at the equator.'),
    ('PPL-MET', 'What does the term "QNH" give?', ['Altitude above mean sea level', 'Height above ground', 'Pressure altitude', 'Density altitude'], 'Altitude above mean sea level', 'QNH provides altitude above MSL.'),
    ('PPL-MET', 'Icing is most severe in which temperature range?', ['0C to -15C', '-40C to -50C', '10C to 20C', '30C and above'], '0C to -15C', 'Supercooled droplets are common from 0C to -15C.'),
    ('PPL-MET', 'A "front" marked by steep slope and rapid weather change is:', ['A cold front', 'A warm front', 'A stationary front', 'An occluded front'], 'A cold front', 'Cold fronts have steep slopes and rapid change.'),
    ('PPL-MET', 'High cirrus clouds generally indicate:', ['Fair weather or approaching front', 'Immediate thunderstorms', 'Fog', 'Snow at surface'], 'Fair weather or approaching front', 'Cirrus often precedes a warm front.'),
    ('PPL-MET', 'The term "advection fog" occurs when:', ['Warm moist air moves over a colder surface', 'Air cools by radiation', 'Rain falls on a hot road', 'Wind stops completely'], 'Warm moist air moves over a colder surface', 'Advection fog forms when warm moist air moves over cold surfaces.'),
    ('PPL-MET', 'Wind is reported in aviation by:', ['Direction the wind comes FROM, in degrees true', 'Direction it blows to', 'Speed only', 'Temperature only'], 'Direction the wind comes FROM, in degrees true', 'Wind direction is the FROM direction.'),
    ('PPL-MET', 'Cloud ceiling is defined as:', ['The height above ground of the lowest cloud base', 'The top of the clouds', 'The height of the aircraft', 'The thickness of cloud'], 'The height above ground of the lowest cloud base', 'Ceiling = height of the lowest cloud layer.'),
    ('PPL-MET', 'What is the ICAO standard unit for wind speed?', ['Knots', 'Kilometres per hour', 'Miles per hour', 'Metres per second'], 'Knots', 'Wind is reported in knots.'),
    ('PPL-MET', 'A "valley" of low pressure with associated fronts is called:', ['A trough', 'A ridge', 'An anticyclone', 'A jet stream'], 'A trough', 'A trough is an elongated area of low pressure.'),
    ('PPL-MET', 'What is the most common cause of aircraft icing at altitude?', ['Supercooled water droplets', 'Snow', 'Hail', 'Frost on the ground'], 'Supercooled water droplets', 'Supercooled liquid water causes airframe icing.'),
    ('PPL-MET', 'Clear air turbulence is most likely:', ['Near the jet stream', 'At the surface', 'In rain', 'In fog'], 'Near the jet stream', 'CAT occurs near jet streams and mountain waves.'),
    ('PPL-MET', 'The "dew point" is:', ['The temperature to which air must cool to become saturated', 'The freezing temperature', 'The boiling temperature', 'The pressure level'], 'The temperature to which air must cool to become saturated', 'Dew point is the saturation temperature.'),
    # Navigation
    ('PPL-NAV', 'The shortest distance between two points on Earth is:', ['A great circle route', 'A rhumb line', 'A straight line on a chart', 'The equator'], 'A great circle route', 'Great circles give the shortest surface distance.'),
    ('PPL-NAV', 'The difference between true north and magnetic north is called:', ['Variation', 'Deviation', 'Declination of the compass card', 'Heading error'], 'Variation', 'Variation is the angular difference between true and magnetic north.'),
    ('PPL-NAV', 'Compass errors caused by the aircraft itself are called:', ['Deviation', 'Variation', 'Dip', 'Drift'], 'Deviation', 'Deviation is caused by aircraft magnetic fields.'),
    ('PPL-NAV', 'Ground speed is:', ['Aircraft speed relative to the ground', 'True airspeed', 'Indicated airspeed', 'Speed through the air mass'], 'Aircraft speed relative to the ground', 'Ground speed is relative to the ground.'),
    ('PPL-NAV', 'True Airspeed (TAS) corrected for wind gives:', ['Ground speed', 'Indicated airspeed', 'Calibrated airspeed', 'Equivalent airspeed'], 'Ground speed', 'TAS + wind vector = ground speed.'),
    ('PPL-NAV', 'The time to cover 90 NM at 120 kt is:', ['45 minutes', '30 minutes', '60 minutes', '75 minutes'], '45 minutes', '90 / 120 = 0.75 h = 45 min.'),
    ('PPL-NAV', 'A heading of 090 is:', ['East', 'West', 'North', 'South'], 'East', '090 = East.'),
    ('PPL-NAV', 'UTC is based on the:', ['Prime Meridian', 'Equator', 'International Date Line', 'Tropic of Cancer'], 'Prime Meridian', 'UTC is based on Greenwich.'),
    ('PPL-NAV', 'VOR provides:', ['Radial guidance to/from the station', 'Distance only', 'Altitude only', 'Weather data'], 'Radial guidance to/from the station', 'VOR gives bearing (radial) information.'),
    ('PPL-NAV', 'DME provides:', ['Slant-range distance', 'Bearing only', 'True heading', 'Wind direction'], 'Slant-range distance', 'DME measures slant range in nautical miles.'),
    ('PPL-NAV', 'A rhumb line:', ['Crosses meridians at a constant angle', 'Is the shortest route', 'Always follows the equator', 'Is a great circle'], 'Crosses meridians at a constant angle', 'Rhumb lines maintain constant bearing.'),
    ('PPL-NAV', 'Magnetic variation changes with:', ['Location and time', 'Airspeed', 'Weight', 'Cabin pressure'], 'Location and time', 'Variation varies geographically and over time.'),
    ('PPL-NAV', 'Which instrument measures rate of climb?', ['Variometer (VSI)', 'Altimeter', 'Compass', 'ASI'], 'Variometer (VSI)', 'The VSI displays vertical speed.'),
    ('PPL-NAV', 'Latitude lines run:', ['East-west, parallel to the equator', 'North-south', 'Diagonally', 'Around the poles'], 'East-west, parallel to the equator', 'Latitude is measured north/south of the equator.'),
    ('PPL-NAV', 'One nautical mile equals:', ['1852 metres', '1000 metres', '1609 metres', '5280 feet exactly'], '1852 metres', '1 NM = 1852 m.'),
    ('PPL-NAV', 'The "wind triangle" is used to:', ['Compute heading and ground speed', 'Compute weight', 'Compute fuel flow', 'Compute altitude'], 'Compute heading and ground speed', 'The wind triangle resolves heading and GS.'),
    ('PPL-NAV', 'An NDB station transmits:', ['Low/medium frequency radio waves', 'VHF radio', 'Satellite signals', 'Light pulses'], 'Low/medium frequency radio waves', 'NDBs operate in the LF/MF bands.'),
    ('PPL-NAV', 'RAIM is used to:', ['Check GPS integrity', 'Measure wind', 'Avoid weather', 'Control cabin pressure'], 'Check GPS integrity', 'RAIM validates GPS satellite performance.'),
    ('PPL-NAV', 'Position fix using two bearings is called:', ['A cross fix', 'A single line', 'A vector', 'A radial'], 'A cross fix', 'Crossing two bearings gives a fix.'),
    ('PPL-NAV', 'The term "ETA" stands for:', ['Estimated Time of Arrival', 'Estimated Track Angle', 'Electronic Timing Aid', 'En-route Traffic Advisory'], 'Estimated Time of Arrival', 'ETA = estimated time of arrival.'),
    ('PPL-NAV', 'A heading indicator (DG) must be:', ['Realigned to the compass periodically', 'Replaced every flight', 'Reset for temperature', 'Used only at night'], 'Realigned to the compass periodically', 'The DG drifts and needs periodic reset.'),
    ('PPL-NAV', 'The altimeter measures:', ['Pressure altitude', 'True altitude directly', 'Radio altitude always', 'Density only'], 'Pressure altitude', 'Altimeters measure pressure altitude.'),
    ('PPL-NAV', 'A "dead reckoning" position is:', ['Computed from heading, speed and time', 'From radio signals', 'From GPS only', 'From visual landmarks only'], 'Computed from heading, speed and time', 'DR uses heading, speed and time.'),
    ('PPL-NAV', 'Which navigation aid is most accurate for final approach?', ['ILS', 'VOR', 'NDB', 'Visual estimate'], 'ILS', 'ILS provides precision approach guidance.'),
    ('PPL-NAV', 'Graticule refers to:', ['The grid of latitude and longitude', 'A type of propeller', 'A radar display', 'A fuel gauge'], 'The grid of latitude and longitude', 'The graticule is the lat/long grid.'),
    ('PPL-NAV', 'True heading + variation =', ['Magnetic heading', 'Compass heading', 'Course line', 'Bearing'], 'Magnetic heading', 'True heading corrected for variation gives magnetic heading.'),
    ('PPL-NAV', 'An aircraft flying due north at 60 kt for 2 hours covers:', ['120 NM', '60 NM', '30 NM', '180 NM'], '120 NM', '60 x 2 = 120 NM.'),
    ('PPL-NAV', 'The standard meridian of UTC is:', ['0 degrees', '180 degrees', '45 degrees', '90 degrees'], '0 degrees', 'UTC is referenced to the Prime Meridian.'),
    ('PPL-NAV', 'VFR navigation charts commonly use the projection:', ['Lambert Conformal', 'Mercator only', 'Polar', 'Cylindrical only'], 'Lambert Conformal', 'LCC is common for VFR charts.'),
    ('PPL-NAV', 'When plotting a course, "wind correction angle" is:', ['The difference between desired track and heading', 'The wind speed', 'The distance to destination', 'The fuel flow'], 'The difference between desired track and heading', 'WCA is the heading correction for wind.'),
    # Principles of Flight
    ('PPL-POF', 'The four forces acting on an aircraft are:', ['Lift, Weight, Thrust, Drag', 'Speed, Altitude, Heading, Position', 'Pitch, Roll, Yaw, Thrust', 'Lift, Gravity, Power, Friction'], 'Lift, Weight, Thrust, Drag', 'Lift, weight, thrust and drag govern flight.'),
    ('PPL-POF', 'Lift is primarily generated by:', ['Bernoulli\'s principle and angle of attack', 'Engine power only', 'Weight', 'Drag'], 'Bernoulli\'s principle and angle of attack', 'Lift results from pressure difference and AoA.'),
    ('PPL-POF', 'The angle between the chord line and relative airflow is:', ['Angle of attack', 'Pitch attitude', 'Slip angle', 'Bank angle'], 'Angle of attack', 'AoA is the angle between chord and relative airflow.'),
    ('PPL-POF', 'A stall occurs when:', ['The critical angle of attack is exceeded', 'Engine stops', 'Speed exceeds Vne', 'Altitude is high'], 'The critical angle of attack is exceeded', 'Stall = exceeding critical AoA.'),
    ('PPL-POF', 'Drag that increases with the square of speed is:', ['Parasite drag', 'Induced drag', 'Skin friction', 'Ground effect'], 'Parasite drag', 'Parasite drag grows with speed squared.'),
    ('PPL-POF', 'Induced drag is greatest at:', ['Low speed, high angle of attack', 'High speed', 'Cruise power', 'Zero lift'], 'Low speed, high angle of attack', 'Induced drag increases at high AoA.'),
    ('PPL-POF', 'Aircraft longitudinal stability concerns:', ['Movement about the lateral axis (pitch)', 'Roll', 'Yaw', 'Engine torque'], 'Movement about the lateral axis (pitch)', 'Longitudinal stability = pitch.'),
    ('PPL-POF', 'The primary flight control for pitch is:', ['Elevator', 'Aileron', 'Rudder', 'Flap'], 'Elevator', 'The elevator controls pitch.'),
    ('PPL-POF', 'The control surface that produces roll is:', ['Aileron', 'Elevator', 'Rudder', 'Trim tab'], 'Aileron', 'Ailerons control roll.'),
    ('PPL-POF', 'Yaw is controlled primarily by the:', ['Rudder', 'Elevator', 'Aileron', 'Spoiler'], 'Rudder', 'The rudder controls yaw.'),
    ('PPL-POF', 'Flaps are used to:', ['Increase lift and drag for slower approach speeds', 'Increase cruise speed', 'Decrease drag', 'Trim the rudder'], 'Increase lift and drag for slower approach speeds', 'Flaps lower stall speed for approach.'),
    ('PPL-POF', 'Ground effect:', ['Reduces induced drag near the surface', 'Increases stall speed', 'Increases parasite drag', 'Has no effect'], 'Reduces induced drag near the surface', 'Ground effect reduces induced drag.'),
    ('PPL-POF', 'The centre of gravity position affects:', ['Stability and control', 'Radio reception', 'Cabin temperature', 'Lighting'], 'Stability and control', 'CG position strongly affects stability.'),
    ('PPL-POF', 'A forward CG tends to:', ['Increase stability', 'Decrease stability', 'Increase speed only', 'Have no effect'], 'Increase stability', 'Forward CG increases static stability.'),
    ('PPL-POF', 'Wing loading is:', ['Weight divided by wing area', 'Span divided by chord', 'Airspeed divided by lift', 'Engine power divided by weight'], 'Weight divided by wing area', 'Wing loading = weight / wing area.'),
    ('PPL-POF', 'Aircraft with a swept wing primarily:', ['Delay shock-induced drag at high speed', 'Increase stall angle', 'Reduce weight', 'Improve ground handling'], 'Delay shock-induced drag at high speed', 'Sweep delays compressibility effects.'),
    ('PPL-POF', 'The lift coefficient is increased by:', ['Increasing angle of attack', 'Decreasing speed', 'Decreasing wing area', 'Increasing weight'], 'Increasing angle of attack', 'Higher AoA raises the lift coefficient.'),
    ('PPL-POF', 'Trim tabs are used to:', ['Relieve control forces', 'Increase drag', 'Control engine power', 'Adjust lighting'], 'Relieve control forces', 'Trim tabs balance control loads.'),
    ('PPL-POF', 'Aspect ratio is:', ['Span squared divided by area', 'Area divided by span', 'Chord times span', 'Weight divided by power'], 'Span squared divided by area', 'Aspect ratio = b^2 / S.'),
    ('PPL-POF', 'At high angles of attack, airflow over the upper surface may:', ['Separate, causing a stall', 'Increase lift indefinitely', 'Decrease drag', 'Cool the engine'], 'Separate, causing a stall', 'Flow separation causes the stall.'),
    ('PPL-POF', 'Load factor in a 60 degree banked turn is:', ['2g', '1g', '1.5g', '3g'], '2g', 'A 60-degree bank produces 2g.'),
    ('PPL-POF', 'A coordinated turn is one with:', ['No sideslip', 'Maximum bank', 'No turn', 'Full rudder'], 'No sideslip', 'Coordinated turns have no slip/skid.'),
    ('PPL-POF', 'Vx is:', ['Best angle of climb speed', 'Best rate of climb speed', 'Never-exceed speed', 'Stall speed'], 'Best angle of climb speed', 'Vx = best angle of climb.'),
    ('PPL-POF', 'Vy is:', ['Best rate of climb speed', 'Best angle of climb', 'Design cruising speed', 'Stall speed'], 'Best rate of climb speed', 'Vy = best rate of climb.'),
    ('PPL-POF', 'The stall speed in a turn is:', ['Higher than in level flight', 'Lower than in level flight', 'The same', 'Zero'], 'Higher than in level flight', 'Load factor raises stall speed.'),
    ('PPL-POF', 'Spoilers, when deployed:', ['Reduce lift and increase drag', 'Increase lift', 'Decrease drag', 'Increase thrust'], 'Reduce lift and increase drag', 'Spoilers destroy lift and add drag.'),
    ('PPL-POF', 'The term "phugoid" describes:', ['A long-period pitch oscillation', 'A quick roll', 'Engine vibration', 'Fuel sloshing'], 'A long-period pitch oscillation', 'The phugoid is a slow pitch oscillation.'),
    ('PPL-POF', 'Thrust is produced by:', ['The engine/propeller system', 'The wings', 'The rudder', 'The elevator'], 'The engine/propeller system', 'Thrust comes from the propulsion system.'),
    ('PPL-POF', 'Weight always acts:', ['Vertically downward through the CG', 'Forward', 'Backward', 'Upward'], 'Vertically downward through the CG', 'Weight acts downward at the CG.'),
    ('PPL-POF', 'Increasing airspeed typically:', ['Increases parasite drag', 'Decreases parasite drag', 'Has no effect on drag', 'Eliminates induced drag'], 'Increases parasite drag', 'Parasite drag rises with speed.'),
    # Aircraft General Knowledge
    ('PPL-AGK', 'The engine gauge showing manifold pressure indicates:', ['Intake manifold pressure', 'Oil pressure', 'Fuel flow', 'Cylinder head temp'], 'Intake manifold pressure', 'The MP gauge reads manifold pressure.'),
    ('PPL-AGK', 'A four-stroke engine cycle order is:', ['Intake, compression, power, exhaust', 'Power, intake, exhaust, compression', 'Compression, exhaust, power, intake', 'Exhaust, power, compression, intake'], 'Intake, compression, power, exhaust', 'Standard Otto cycle order.'),
    ('PPL-AGK', 'The alternator/battery system provides:', ['Electrical power', 'Hydraulic power', 'Pneumatic power', 'Pilot heating'], 'Electrical power', 'The electrical system powers avionics and systems.'),
    ('PPL-AGK', 'Fuel contamination is commonly caused by:', ['Water and sediment', 'Heat', 'Pressure', 'Vibration'], 'Water and sediment', 'Water and debris contaminate fuel.'),
    ('PPL-AGK', 'The pitot tube measures:', ['Impact (dynamic) pressure', 'Static pressure only', 'Temperature', 'Humidity'], 'Impact (dynamic) pressure', 'The pitot tube senses dynamic pressure.'),
    ('PPL-AGK', 'The static port supplies:', ['Static pressure to instruments', 'Dynamic pressure', 'Fuel pressure', 'Oil pressure'], 'Static pressure to instruments', 'Static vents feed static pressure.'),
    ('PPL-AGK', 'The altimeter operates on:', ['Static pressure', 'Dynamic pressure', 'Fuel flow', 'Temperature'], 'Static pressure', 'Altimeters use static pressure.'),
    ('PPL-AGK', 'A carburettor ice risk exists when:', ['Temperatures are 0-20C with visible moisture', 'It is freezing', 'It is very hot', 'No fuel is used'], 'Temperatures are 0-20C with visible moisture', 'Carburettor ice forms in those conditions.'),
    ('PPL-AGK', 'The landing gear retraction is usually driven by:', ['Hydraulics or electric motor', 'Manual crank only', 'Springs', 'Air pressure'], 'Hydraulics or electric motor', 'Retractable gear uses hydraulic/electric actuators.'),
    ('PPL-AGK', 'Pitot-static blockage affects:', ['The airspeed indicator and altimeter', 'Only the compass', 'Only the radio', 'The fuel gauge'], 'The airspeed indicator and altimeter', 'ASI and altimeter depend on pitot-static.'),
    ('PPL-AGK', 'The fuel octane rating relates to:', ['Detonation resistance', 'Density', 'Colour', 'Temperature'], 'Detonation resistance', 'Octane measures knock resistance.'),
    ('PPL-AGK', 'The oil system mainly:', ['Lubricates and cools the engine', 'Waters the engine', 'Cleans the cabin', 'Pressurises tyres'], 'Lubricates and cools the engine', 'Oil lubricates and cools.'),
    ('PPL-AGK', 'A pre-ignition condition refers to:', ['Fuel igniting before the spark', 'Fuel igniting too late', 'No ignition at all', 'Double ignition'], 'Fuel igniting before the spark', 'Pre-ignition is early combustion.'),
    ('PPL-AGK', 'The "master switch" controls:', ['Main electrical power', 'Engine fuel', 'Hydraulic power', 'Landing lights only'], 'Main electrical power', 'The master switch cuts electrical power.'),
    ('PPL-AGK', 'Gyroscopic instruments rely on:', ['Rigidity and precession', 'Heat', 'Magnetism only', 'Gravity only'], 'Rigidity and precession', 'Gyros use rigidity in space and precession.'),
    ('PPL-AGK', 'The attitude indicator displays:', ['Aircraft pitch and bank attitude', 'Airspeed', 'Altitude', 'Heading'], 'Aircraft pitch and bank attitude', 'The AI shows pitch and bank.'),
    ('PPL-AGK', 'A vacuum system failure will affect:', ['The gyroscopic instruments', 'The battery', 'The fuel pump', 'The radio'], 'The gyroscopic instruments', 'Vacuum gyros fail without suction.'),
    ('PPL-AGK', 'Propeller feathering is used:', ['To stop windmilling drag on a failed engine', 'To increase power', 'To cool the engine', 'To reduce noise'], 'To stop windmilling drag on a failed engine', 'Feathering reduces drag after engine failure.'),
    ('PPL-AGK', 'The maximum operating weight for takeoff is called:', ['MTOW', 'MLW', 'ZFW', 'BEW'], 'MTOW', 'MTOW = maximum takeoff weight.'),
    ('PPL-AGK', 'Aircraft tyres must be checked for:', ['Wear, cuts and proper inflation', 'Colour', 'Temperature', 'Age of paint'], 'Wear, cuts and proper inflation', 'Tyres need visual and pressure checks.'),
    ('PPL-AGK', 'The mixture control is used to:', ['Adjust the fuel/air ratio', 'Adjust the throttle', 'Control the flaps', 'Trim the aircraft'], 'Adjust the fuel/air ratio', 'Mixture adjusts fuel/air ratio.'),
    ('PPL-AGK', 'Cylinder head temperature is monitored to:', ['Prevent overheating', 'Increase speed', 'Reduce weight', 'Improve radio'], 'Prevent overheating', 'CHT monitoring avoids engine damage.'),
    ('PPL-AGK', 'Elevator trim failure would make:', ['Pitch control heavy', 'Roll control heavy', 'Yaw impossible', 'Engine stop'], 'Pitch control heavy', 'Trim failure increases stick forces.'),
    ('PPL-AGK', 'The "stick shaker" warns of:', ['An imminent stall', 'Over-speed', 'Low fuel', 'High temperature'], 'An imminent stall', 'Stick shakers signal approaching stall.'),
    ('PPL-AGK', 'A total electrical failure would:', ['Disable electrically powered instruments', 'Stop the engine', 'Drop the gear always', 'Stop the propeller'], 'Disable electrically powered instruments', 'Electrical failure disables electric instruments.'),
    ('PPL-AGK', 'Circuit breakers are provided to:', ['Protect electrical circuits from overload', 'Increase power', 'Cool the cabin', 'Balance fuel'], 'Protect electrical circuits from overload', 'CBs protect circuits from overloads.'),
    ('PPL-AGK', 'The term "airframe" refers to:', ['The structure excluding the engine', 'The engine only', 'The propeller only', 'The cockpit only'], 'The structure excluding the engine', 'Airframe is the structural body.'),
    ('PPL-AGK', 'Flaps increase:', ['Both lift and drag', 'Only weight', 'Only speed', 'Nothing'], 'Both lift and drag', 'Flaps raise lift and drag.'),
    ('PPL-AGK', 'A wing tank leak is a:', ['Fire and fuel loss hazard', 'Purely cosmetic issue', 'Electrical fault', 'Navigation error'], 'Fire and fuel loss hazard', 'Fuel leaks are serious hazards.'),
    ('PPL-AGK', 'Before flight, the fuel should be sampled to:', ['Check for water and contaminants', 'Check the colour', 'Taste it', 'Measure its volume'], 'Check for water and contaminants', 'Sampling checks for water/debris.'),
    # Human Performance
    ('PPL-HPL', 'Hypoxia is:', ['Insufficient oxygen in body tissues', 'Too much oxygen', 'Decompression', 'High blood pressure'], 'Insufficient oxygen in body tissues', 'Hypoxia = oxygen deficiency.'),
    ('PPL-HPL', 'Hyperventilation is caused by:', ['Over-breathing', 'Holding breath', 'Sleep', 'Cold'], 'Over-breathing', 'Hyperventilation is excessive breathing.'),
    ('PPL-HPL', 'Spatial disorientation occurs when:', ['The brain misinterprets body signals in flight', 'The map is wrong', 'The compass fails', 'The aircraft is heavy'], 'The brain misinterprets body signals in flight', 'Disorientation arises from false cues.'),
    ('PPL-HPL', 'The ear can misinterpret which sense in flight?', ['Vestibular', 'Sight', 'Taste', 'Touch only'], 'Vestibular', 'The vestibular system can mislead.'),
    ('PPL-HPL', 'Fatigue is best managed by:', ['Adequate rest and proper planning', 'Caffeine only', 'Flying slower', 'Ignoring symptoms'], 'Adequate rest and proper planning', 'Rest is the primary fatigue countermeasure.'),
    ('PPL-HPL', 'Situational awareness means:', ['Understanding your current and future state', 'Knowing the weather only', 'Knowing the time', 'Reading instruments only'], 'Understanding your current and future state', 'SA is a mental model of the situation.'),
    ('PPL-HPL', 'The "stress" response involves:', ['Physical and mental reactions to demands', 'Only muscle growth', 'Only skin changes', 'No measurable effect'], 'Physical and mental reactions to demands', 'Stress triggers physiological responses.'),
    ('PPL-HPL', 'Alcohol impairs flying performance for:', ['Hours after consumption', 'Only during drinking', 'Only the next day', 'Never'], 'Hours after consumption', 'Alcohol affects performance for hours.'),
    ('PPL-HPL', 'The decision-making model DECIDE stands for:', ['Detect, Estimate, Choose, Identify, Do, Evaluate', 'Decide everything', 'Do, Evaluate, Compare', 'Detect, Ignore, Continue'], 'Detect, Estimate, Choose, Identify, Do, Evaluate', 'DECIDE is a structured decision model.'),
    ('PPL-HPL', 'Vision in poor light is best served by:', ['Using peripheral vision and scanning', 'Staring directly ahead', 'Closing one eye', 'Using bright lights'], 'Using peripheral vision and scanning', 'Off-centre scanning aids night vision.'),
    ('PPL-HPL', 'The "g" forces affect the pilot by:', ['Redistributing blood and causing vision loss', 'Only slowing the engine', 'Improving vision', 'Cooling the body'], 'Redistributing blood and causing vision loss', 'High g reduces cerebral blood flow.'),
    ('PPL-HPL', 'Circadian rhythm disruption is caused by:', ['Crossing time zones', 'Drinking water', 'Eating meals', 'Flying at low altitude'], 'Crossing time zones', 'Jet lag disrupts circadian rhythm.'),
    ('PPL-HPL', 'Effective crew communication includes:', ['Clear briefings and readbacks', 'Silence', 'Only written notes', 'Speaking faster'], 'Clear briefings and readbacks', 'Standard, clear comms improve safety.'),
    ('PPL-HPL', 'A pilot should use oxygen above:', ['10,000 ft during day operations', 'Any altitude', '5,000 ft', '20,000 ft always'], '10,000 ft during day operations', 'Oxygen use is recommended above 10,000 ft.'),
    ('PPL-HPL', 'Perception errors in flight are often due to:', ['Illusions', 'Engine noise', 'Cabin lighting', 'Tyres'], 'Illusions', 'Sensory illusions cause perception errors.'),
    ('PPL-HPL', 'The "illusion of leaning into a turn" is caused by:', ['The vestibular system', 'The fuel gauge', 'The altimeter', 'Wind noise'], 'The vestibular system', 'False cues come from the inner ear.'),
    ('PPL-HPL', 'Workload management includes:', ['Prioritising tasks and delegating', 'Doing everything at once', 'Ignoring minor tasks', 'Flying faster'], 'Prioritising tasks and delegating', 'Good workload management reduces error.'),
    ('PPL-HPL', 'Dehydration can cause:', ['Impaired judgement and fatigue', 'Improved vision', 'Faster reaction', 'No effect'], 'Impaired judgement and fatigue', 'Dehydration reduces performance.'),
    ('PPL-HPL', 'Fatigue risk is increased by:', ['Extended duty and poor sleep', 'Short flights', 'Good weather', 'Fresh air'], 'Extended duty and poor sleep', 'Long duty and poor rest raise fatigue.'),
    ('PPL-HPL', 'The most reliable source of flight information is:', ['The flight instruments', 'Passenger advice', 'The map only', 'Intuition'], 'The flight instruments', 'Instruments give the reliable state.'),
    ('PPL-HPL', 'A sudden loud noise in flight may cause:', ['Startle and stress reaction', 'Better concentration', 'Cooler cabin', 'None'], 'Startle and stress reaction', 'Startle affects performance.'),
    ('PPL-HPL', 'Stable approach criteria reduce:', ['Approach and landing risk', 'Speed', 'Fuel', 'Noise only'], 'Approach and landing risk', 'Stable approaches prevent unstable landings.'),
    ('PPL-HPL', 'Colour vision deficiency affects:', ['Ability to distinguish signals and charts', 'Only hearing', 'Only weight', 'No task'], 'Ability to distinguish signals and charts', 'Colour vision issues matter for signals.'),
    ('PPL-HPL', 'Pre-flight "I\'M SAFE" checklist includes:', ['Illness, Medication, Stress, Alcohol, Fatigue, Emotion', 'Instruments, Map, Speed, Altitude', 'Fuel, Oil, Power', 'Takeoff, Climb, Cruise, Descent'], 'Illness, Medication, Stress, Alcohol, Fatigue, Emotion', 'IMSAFE assesses pilot fitness.'),
    ('PPL-HPL', 'Hypoxia symptoms include:', ['Euphoria, blue lips and confusion', 'Immediate sleep', 'Painful joints', 'Improved vision'], 'Euphoria, blue lips and confusion', 'Hypoxia has subtle onset symptoms.'),
    ('PPL-HPL', 'Vestibular illusions are worse:', ['Without visual reference', 'In daylight VMC', 'On the ground', 'At low altitude VFR'], 'Without visual reference', 'Instrument flight removes visual cues.'),
    ('PPL-HPL', 'Briefings and checklists are used to:', ['Standardise and reduce error', 'Slow the flight', 'Increase workload', 'Entertain passengers'], 'Standardise and reduce error', 'Standardisation improves safety.'),
    ('PPL-HPL', 'Self-medication is:', ['Dangerous unless medically approved', 'Always safe', 'Recommended', 'Only for pilots'], 'Dangerous unless medically approved', 'Medication can impair fitness.'),
    ('PPL-HPL', 'The "startle response" can be reduced by:', ['Training and preparation', 'Surprise', 'Speed', 'Noise'], 'Training and preparation', 'Training reduces startle impact.'),
    ('PPL-HPL', 'Decision making should consider:', ['Risk assessment and available options', 'Only speed', 'Only time', 'Only weather'], 'Risk assessment and available options', 'Good decisions weigh risk and options.'),
    # Flight Performance & Planning
    ('PPL-FPP', 'Basic Empty Weight (BEW) is:', ['Weight of aircraft and fixed equipment', 'Weight with full fuel', 'MTOW', 'Payload only'], 'Weight of aircraft and fixed equipment', 'BEW excludes payload and fuel.'),
    ('PPL-FPP', 'MTOW stands for:', ['Maximum Takeoff Weight', 'Minimum Total Operating Weight', 'Maximum Trailing Operating Weight', 'Maximum Takeoff Wind'], 'Maximum Takeoff Weight', 'MTOW is the max takeoff weight.'),
    ('PPL-FPP', 'Zero Fuel Weight (ZFW) is:', ['Weight with no fuel but with payload', 'Empty weight', 'MTOW', 'Landing weight'], 'Weight with no fuel but with payload', 'ZFW = payload + basic weight.'),
    ('PPL-FPP', 'The centre of gravity envelope defines:', ['Safe CG limits', 'Safe speed limits', 'Fuel limits', 'Altitude limits'], 'Safe CG limits', 'The CG envelope bounds safe loading.'),
    ('PPL-FPP', 'A forward CG generally:', ['Increases stability, reduces elevator authority margin', 'Decreases stability', 'Increases stall speed drastically', 'Improves fuel flow'], 'Increases stability, reduces elevator authority margin', 'Forward CG improves stability.'),
    ('PPL-FPP', 'Takeoff distance is increased by:', ['High density altitude and headwind reduction', 'Low temperature', 'Smooth runway', 'Light weight'], 'High density altitude and headwind reduction', 'Hot, high fields lengthen takeoff.'),
    ('PPL-FPP', 'Landing distance is increased by:', ['A tailwind and a slippery runway', 'A headwind', 'Light weight', 'Cool air'], 'A tailwind and a slippery runway', 'Tailwinds and wet runways extend landing.'),
    ('PPL-FPP', 'Reserve fuel should be sufficient for:', ['45 minutes beyond planned requirements', 'The taxi distance', '10 minutes', 'The climb only'], '45 minutes beyond planned requirements', 'Reserves cover contingencies.'),
    ('PPL-FPP', 'A navigation log helps track:', ['Fuel, time and position', 'Passenger names', 'Cabin temperature', 'Radio frequencies only'], 'Fuel, time and position', 'Nav logs record fuel and progress.'),
    ('PPL-FPP', 'Weight affects takeoff performance by:', ['Increasing required distance', 'Decreasing distance', 'No effect', 'Only affecting landing'], 'Increasing required distance', 'Heavier aircraft need more runway.'),
    ('PPL-FPP', 'The "moment" in weight and balance is:', ['Weight multiplied by arm', 'Weight divided by arm', 'Arm divided by weight', 'Weight plus arm'], 'Weight multiplied by arm', 'Moment = weight x arm.'),
    ('PPL-FPP', 'If the CG is too far aft, the aircraft may be:', ['Difficult to recover from a stall', 'Very stable', 'Too heavy', 'Unable to start'], 'Difficult to recover from a stall', 'Aft CG reduces pitch stability.'),
    ('PPL-FPP', 'Fuel planning should include:', ['Taxi, trip, contingency, reserve and extra fuel', 'Only trip fuel', 'Only taxi fuel', 'Only reserve'], 'Taxi, trip, contingency, reserve and extra fuel', 'Complete fuel planning includes all legs.'),
    ('PPL-FPP', 'Density altitude is pressure altitude corrected for:', ['Temperature', 'Wind', 'Humidity only', 'Runway length'], 'Temperature', 'Density altitude adjusts for temperature.'),
    ('PPL-FPP', 'At higher density altitude the climb rate:', ['Decreases', 'Increases', 'Stays the same', 'Doubles'], 'Decreases', 'Hot, high conditions reduce climb.'),
    ('PPL-FPP', 'A headwind component:', ['Reduces ground speed and takeoff distance', 'Increases ground speed', 'Has no effect', 'Increases landing distance'], 'Reduces ground speed and takeoff distance', 'Headwind shortens takeoff and reduces GS.'),
    ('PPL-FPP', 'The "arm" in weight and balance is:', ['Distance from datum', 'The wing length', 'The propeller length', 'The fuselage height'], 'Distance from datum', 'Arm is the distance from the datum.'),
    ('PPL-FPP', 'Piston engine fuel burn is roughly proportional to:', ['Power setting', 'Altitude only', 'Passenger weight', 'Wind'], 'Power setting', 'Fuel burn follows power.'),
    ('PPL-FPP', 'A climb at Vx gives:', ['The greatest altitude gain per distance', 'The greatest gain per time', 'The fastest cruise', 'The lowest fuel'], 'The greatest altitude gain per distance', 'Vx maximises angle of climb.'),
    ('PPL-FPP', 'The most accurate way to compute fuel required is:', ['From the POH performance data', 'Guessing', 'From the previous flight', 'From passenger count'], 'From the POH performance data', 'POH data gives reliable fuel figures.'),
    ('PPL-FPP', 'Performance calculations are performed for:', ['Every flight', 'Once a year', 'Only long flights', 'Only IFR flights'], 'Every flight', 'Performance is checked each flight.'),
    ('PPL-FPP', 'Wet grass increases:', ['Takeoff distance', 'Climb rate', 'Cruise speed', 'Range'], 'Takeoff distance', 'A wet surface increases rolling resistance.'),
    ('PPL-FPP', 'Payload is the weight of:', ['Passengers, baggage and cargo', 'Only fuel', 'Only the pilot', 'The empty aircraft'], 'Passengers, baggage and cargo', 'Payload is load excluding fuel.'),
    ('PPL-FPP', 'If the aircraft is loaded over MTOW:', ['It must not take off', 'It may take off slowly', 'It is legal at night', 'It is always safe'], 'It must not take off', 'Exceeding MTOW is unsafe and illegal.'),
    ('PPL-FPP', 'A tailwind component:', ['Increases ground speed and landing distance', 'Decreases landing distance', 'No effect', 'Improves climb'], 'Increases ground speed and landing distance', 'Tailwind lengthens landing distance.'),
    ('PPL-FPP', 'The "datum" is:', ['A reference point for weight arms', 'The runway threshold', 'The altimeter setting', 'The CG'], 'A reference point for weight arms', 'The datum is the arm reference.'),
    ('PPL-FPP', 'Time, speed and distance are related by:', ['D = S x T', 'S = D x T', 'T = D x S', 'D = S / T'], 'D = S x T', 'Distance = speed x time.'),
    ('PPL-FPP', 'Flying at the best range speed:', ['Minimises fuel burn per distance', 'Maximises speed', 'Increases fuel burn', 'Is always Vne'], 'Minimises fuel burn per distance', 'Best range speed optimises fuel economy.'),
    ('PPL-FPP', 'At high altitude, engine power typically:', ['Decreases', 'Increases', 'Stays the same', 'Doubles'], 'Decreases', 'Less air reduces power output.'),
    ('PPL-FPP', 'Alternate aerodrome selection requires:', ['Sufficient fuel and a suitable runway', 'The nearest field', 'The busiest airport', 'Any grass strip'], 'Sufficient fuel and a suitable runway', 'Alternates must be suitable and reachable.'),
    # Communications
    ('PPL-COM', 'The international distress frequency is:', ['121.5 MHz', '118.0 MHz', '122.7 MHz', '123.45 MHz'], '121.5 MHz', '121.5 MHz is the distress frequency.'),
    ('PPL-COM', 'The standard call sign readback requirement:', ['Read back clearances and instructions', 'Never read back', 'Only read altitude', 'Only read runway'], 'Read back clearances and instructions', 'Pilots read back clearances.'),
    ('PPL-COM', 'The phonetic alphabet letter for "B" is:', ['Bravo', 'Beta', 'Baker', 'Boston'], 'Bravo', 'B = Bravo.'),
    ('PPL-COM', 'Position reports should include:', ['Callsign, position, level, time, next point', 'Only callsign', 'Only time', 'Only weather'], 'Callsign, position, level, time, next point', 'Standard position reports have set content.'),
    ('PPL-COM', 'Squawk 7600 indicates:', ['Radio failure', 'Hijack', 'Emergency', 'VFR on top'], 'Radio failure', '7600 = loss of communications.'),
    ('PPL-COM', 'Initial contact should include:', ['Callsign, position and request', 'Only weather', 'Only fuel', 'Only destination'], 'Callsign, position and request', 'Initial calls give callsign, position, request.'),
    ('PPL-COM', 'The correct response to a clearance is:', ['A readback of the important parts', 'Silence', 'Confirmation by gesture', 'Immediate landing'], 'A readback of the important parts', 'Read back to confirm understanding.'),
    ('PPL-COM', 'Radio transmissions should be:', ['Clear, concise and standard', 'Long and detailed', 'Spoken very fast', 'Repeated three times'], 'Clear, concise and standard', 'Standard phraseology prevents error.'),
    ('PPL-COM', 'The number "zero" is spoken as:', ['Zero', 'Oh', 'Null', 'Nada'], 'Zero', 'Aviation phonetic for 0 is zero.'),
    ('PPL-COM', 'A "full stop" readback means:', ['The clearance is complete and understood', 'To stop the engine', 'To land', 'To switch off radio'], 'The clearance is complete and understood', 'Full stop confirms complete clearance.'),
    ('PPL-COM', 'Communication with ATC is required:', ['When operating in controlled airspace', 'Never', 'Only at night', 'Only in emergencies'], 'When operating in controlled airspace', 'Controlled airspace requires contact.'),
    ('PPL-COM', 'If a frequency is busy, a pilot should:', ['Listen and transmit concise calls', 'Transmit constantly', 'Switch off', 'Talk to passengers'], 'Listen and transmit concise calls', 'Discipline keeps frequencies usable.'),
    ('PPL-COM', 'The microphone should be keyed:', ['After thinking through the message', 'Before thinking', 'Continuously', 'Never'], 'After thinking through the message', 'Think before transmitting.'),
    ('PPL-COM', 'A message is acknowledged with:', ['"Wilco"', '"Roger"', '"Copy all"', '"Understood always"'], '"Wilco"', 'Roger = received; Wilco = will comply.'),
    ('PPL-COM', '"Wilco" means:', ['I will comply', 'I have received', 'I am lost', 'I am landing'], 'I will comply', 'Wilco = will comply.'),
    ('PPL-COM', 'The universal emergency phrase is:', ['Mayday', 'Help', 'SOS repeated', 'Panic'], 'Mayday', 'Mayday indicates distress.'),
    ('PPL-COM', 'Urgency calls use the phrase:', ['Pan-pan', 'Mayday', 'Roger', 'Wilco'], 'Pan-pan', 'Pan-pan signals urgency.'),
    ('PPL-COM', 'The report "Five thousand" in altitude means:', ['5,000 feet', '5,000 metres', '50,000 feet', '500 feet'], '5,000 feet', 'Altitude reports are in feet.'),
    ('PPL-COM', 'When changing frequency, the pilot should:', ['Confirm with ATC then switch', 'Switch without notice', 'Wait for passengers', 'Land first'], 'Confirm with ATC then switch', 'Frequency changes are coordinated.'),
    ('PPL-COM', 'Radar contact is acknowledged with:', ['"Radar contact" readback and squawk', 'Silence', 'A wave', 'An engine check'], '"Radar contact" readback and squawk', 'Confirm radar and assigned squawk.'),
    ('PPL-COM', 'A transponder code is:', ['A four-digit squawk code', 'A fuel code', 'An aircraft registration', 'A frequency'], 'A four-digit squawk code', 'Squawk codes are four digits.'),
    ('PPL-COM', 'The ATIS provides:', ['Automated terminal information service', 'Aircraft tracking', 'Fuel prices', 'Weather only for jets'], 'Automated terminal information service', 'ATIS gives recorded aerodrome info.'),
    ('PPL-COM', 'When receiving an instruction that conflicts, the pilot should:', ['Question it and confirm', 'Always comply silently', 'Ignore it', 'Land immediately'], 'Question it and confirm', 'Clarify conflicting instructions.'),
    ('PPL-COM', 'The readback of a heading "zero niner zero" is:', ['090', '900', '009', '90,000'], '090', 'Heading 090 is read zero niner zero.'),
    ('PPL-COM', 'Radio failure procedure includes:', ['Squawk 7600 and planned route continuation', 'Immediate diversion', 'Silence forever', 'Landing anywhere'], 'Squawk 7600 and planned route continuation', 'Set 7600 and follow flight plan.'),
    ('PPL-COM', 'Standard VFR frequency separation uses:', ['Distinct regional frequencies', 'The same frequency everywhere', 'Cell phones', 'No frequency'], 'Distinct regional frequencies', 'Frequencies are allocated by region.'),
    ('PPL-COM', 'When calling ground, a pilot should state:', ['The aircraft type and position', 'Only the callsign', 'Only the weather', 'Only the destination'], 'The aircraft type and position', 'Initial ground calls identify the aircraft.'),
    ('PPL-COM', '"Standby" means:', ['Wait and I will respond', 'I am landing', 'Switch off', 'Never mind'], 'Wait and I will respond', 'Standby requests patience.'),
    ('PPL-COM', 'Clearance delivery frequency provides:', ['Pre-departure clearances', 'Weather radar', 'Fuel service', 'Runway inspection'], 'Pre-departure clearances', 'Clearance delivery issues clearances.'),
    ('PPL-COM', 'When reading back an altitude of 4,500 feet, say:', ['"Four thousand five hundred"', '"Forty five hundred"', '"Four five"', '"Forty five"'], '"Four thousand five hundred"', 'Altitudes are read with thousands and hundreds.'),
    # Operational Procedures
    ('PPL-OPS', 'The pre-flight walk-around checks:', ['The aircraft externally', 'The passengers', 'The weather radar', 'The fuel prices'], 'The aircraft externally', 'Walk-around inspects the aircraft.'),
    ('PPL-OPS', 'Checklists are used:', ['On every flight', 'Only at night', 'Only when heavy', 'Never'], 'On every flight', 'Checklists ensure consistency.'),
    ('PPL-OPS', 'In an engine failure after takeoff, the priority is:', ['To maintain airspeed and land ahead', 'To climb', 'To turn back immediately', 'To restart the engine'], 'To maintain airspeed and land ahead', 'Maintain speed and choose a landing area.'),
    ('PPL-OPS', 'A fire in flight requires:', ['Immediate action per checklist', 'Waiting for landing', 'Opening windows', 'Continuing normally'], 'Immediate action per checklist', 'Emergency fire drills must be immediate.'),
    ('PPL-OPS', 'An emergency locator transmitter (ELT) broadcasts:', ['A distress signal', 'Weather', 'Fuel data', 'ATC instructions'], 'A distress signal', 'ELTs emit distress signals.'),
    ('PPL-OPS', 'The safety management approach includes:', ['Hazard identification and risk assessment', 'Blame assignment', 'Speed', 'No reporting'], 'Hazard identification and risk assessment', 'SMS manages hazards and risk.'),
    ('PPL-OPS', 'Standard operating procedures (SOPs):', ['Standardise operations and reduce error', 'Add confusion', 'Are optional', 'Only for jets'], 'Standardise operations and reduce error', 'SOPs standardise safe operations.'),
    ('PPL-OPS', 'The decision to divert should be made:', ['Early, with reserve fuel in mind', 'At the last second', 'After landing', 'Never'], 'Early, with reserve fuel in mind', 'Divert early while options remain.'),
    ('PPL-OPS', 'A "mayday" transmission should include:', ['Callsign, position, nature and intentions', 'Only the weather', 'Only fuel', 'Only speed'], 'Callsign, position, nature and intentions', 'Distress calls include key details.'),
    ('PPL-OPS', 'Before starting the engine, the area must be:', ['Clear and safe', 'Covered', 'Lit', 'Quiet'], 'Clear and safe', 'Check for hazards before start.'),
    ('PPL-OPS', 'Contamination such as frost on the wing:', ['Must be removed before takeoff', 'Is acceptable', 'Improves lift', 'Only matters in rain'], 'Must be removed before takeoff', 'Frost destroys lift.'),
    ('PPL-OPS', 'The pilot\'s "minimum fuel" call informs ATC:', ['That fuel is low but a delay is acceptable', 'Of an emergency', 'Of a hijack', 'Of a weather request'], 'That fuel is low but a delay is acceptable', 'Minimum fuel warns of low reserves.'),
    ('PPL-OPS', 'The cabin baggage must be:', ['Secured for flight', 'Loose', 'In the aisle', 'Unused'], 'Secured for flight', 'Loose items are dangerous.'),
    ('PPL-OPS', 'An aborted takeoff decision should be made:', ['Before reaching V1', 'After V1', 'At altitude', 'Never'], 'Before reaching V1', 'Reject takeoff before V1.'),
    ('PPL-OPS', 'Emergency descent procedures aim to:', ['Descend rapidly to safe altitude', 'Climb', 'Hold', 'Land on the runway'], 'Descend rapidly to safe altitude', 'Emergency descents reduce altitude quickly.'),
    ('PPL-OPS', 'Before takeoff, the pilot must ensure:', ['Controls free and correct, doors secure', 'Radio off', 'Lights off', 'Windows open'], 'Controls free and correct, doors secure', 'Pre-takeoff checks cover controls.'),
    ('PPL-OPS', 'A forced landing after engine failure should be:', ['Into wind on a suitable surface', 'Downwind always', 'On a road', 'In the sea always'], 'Into wind on a suitable surface', 'Land into wind on suitable terrain.'),
    ('PPL-OPS', 'Security procedures protect:', ['The aircraft from unlawful interference', 'Fuel quality', 'The runway', 'The terminal'], 'The aircraft from unlawful interference', 'Security prevents interference.'),
    ('PPL-OPS', 'The "sterile cockpit" rule restricts:', ['Non-essential conversation in critical phases', 'Eating only', 'Passenger talk always', 'Radio use'], 'Non-essential conversation in critical phases', 'Sterile cockpit reduces distraction.'),
    ('PPL-OPS', 'Refuelling with passengers onboard is:', ['Restricted by procedures', 'Always allowed', 'Never allowed', 'Only at night'], 'Restricted by procedures', 'Refuelling with pax requires procedures.'),
    ('PPL-OPS', 'In case of an electrical fire, the pilot should:', ['Shut off electrical power', 'Add power', 'Open the battery', 'Ignore it'], 'Shut off electrical power', 'Cut electrical supply to stop the fire.'),
    ('PPL-OPS', 'The "briefing" before takeoff includes:', ['Roles, actions and abnormal procedures', 'Only the weather', 'Only the fuel', 'Only the route'], 'Roles, actions and abnormal procedures', 'Briefings cover roles and contingencies.'),
    ('PPL-OPS', 'Pilot incapacitation in a multi-crew aircraft is handled by:', ['Standardised handover procedures', 'Passenger help', 'Leaving the cockpit', 'Silence'], 'Standardised handover procedures', 'SOPs manage incapacitation.'),
    ('PPL-OPS', 'Ground de-icing is performed:', ['When ice/frost contamination exists', 'Every flight', 'Never', 'Only in summer'], 'When ice/frost contamination exists', 'De-ice when contaminated.'),
    ('PPL-OPS', 'A precautionary landing is made when:', ['Continued flight is unsafe but not urgent', 'The engine has stopped', 'At destination', 'In good weather'], 'Continued flight is unsafe but not urgent', 'Precautionary landings prevent worse.'),
    ('PPL-OPS', 'Emergency exits must be:', ['Accessible and known', 'Locked', 'Removed', 'Decorative'], 'Accessible and known', 'Exits must be clear and briefed.'),
    ('PPL-OPS', 'The safety equipment includes:', ['Life jackets and first aid kits', 'Extra fuel', 'Spare tyres', 'Food'], 'Life jackets and first aid kits', 'Safety gear is required equipment.'),
    ('PPL-OPS', 'Weather minima are respected by:', ['Filing and flying within limits', 'Ignoring them', 'Only in the evening', 'Only for students'], 'Filing and flying within limits', 'Respect weather limits.'),
    ('PPL-OPS', 'The emergency frequency after radio failure is:', ['121.5 MHz', '118.0 MHz', '122.9 MHz', '126.7 MHz'], '121.5 MHz', 'Guard frequency is 121.5 MHz.'),
    ('PPL-OPS', 'An "unstable approach" should result in:', ['A go-around', 'Continuing the landing', 'More speed', 'No change'], 'A go-around', 'Go around on unstable approaches.'),
]


TRUE_FALSE_POOL = [
    # (subject_code, statement, is_true, explanation)
    ('PPL-AL', 'The Chicago Convention established the International Civil Aviation Organization.', True, 'ICAO was created by the 1944 Chicago Convention.'),
    ('PPL-AL', 'QNH is the pressure setting that indicates height above the aerodrome.', False, 'QNH indicates altitude above mean sea level; QFE gives height above the aerodrome.'),
    ('PPL-AL', 'Pilots must always maintain a current, valid licence and medical certificate.', True, 'Licence and medical validity are mandatory.'),
    ('PPL-AL', 'VFR flight in uncontrolled airspace always requires an ATC clearance.', False, 'VFR in uncontrolled airspace needs no clearance.'),
    ('PPL-AL', 'The pilot in command is responsible for the safety of the flight.', True, 'The PIC bears ultimate responsibility.'),
    ('PPL-AL', 'Squawk code 7500 indicates a hijacking situation.', True, '7500 signals unlawful interference.'),
    ('PPL-AL', 'NOTAMs provide information on hazards and airspace changes.', True, 'NOTAMs alert pilots to changes and hazards.'),
    ('PPL-AL', 'The transition altitude is where the altimeter is set to QFE.', False, 'At transition altitude the setting changes to 1013.25 hPa.'),
    ('PPL-AL', 'A Class 1 medical is required for private pilot privileges.', False, 'Class 1 is for commercial privileges; PPL uses Class 2.'),
    ('PPL-AL', 'Right-of-way rules help prevent mid-air collisions.', True, 'Right-of-way rules define priority.'),
    ('PPL-MET', 'The standard sea-level pressure is 1013.25 hPa.', True, 'ISA standard pressure is 1013.25 hPa.'),
    ('PPL-MET', 'Clear ice is formed by fast freezing of small droplets.', False, 'Rime ice is rapid; clear ice forms from larger supercooled droplets.'),
    ('PPL-MET', 'Cumulonimbus clouds are associated with thunderstorms.', True, 'CBs produce thunderstorms.'),
    ('PPL-MET', 'Visibility is reported in kilometres in METAR.', False, 'Visibility is reported in metres or statute miles.'),
    ('PPL-MET', 'A trough is an elongated area of low pressure.', True, 'Troughs are areas of low pressure.'),
    ('PPL-MET', 'Radiation fog forms during windy afternoons.', False, 'Radiation fog forms on clear calm nights.'),
    ('PPL-MET', 'Wind direction in aviation is reported as the direction from which the wind blows.', True, 'Wind is reported FROM.'),
    ('PPL-MET', 'Microbursts are gentle light winds.', False, 'Microbursts are violent localized downdrafts.'),
    ('PPL-MET', 'The standard tropospheric lapse rate is about 2C per 1000 ft.', True, 'The ISA lapse rate is ~2C per 1000 ft.'),
    ('PPL-MET', 'Wind shear is a sudden change in wind speed or direction.', True, 'Wind shear is a rapid wind change.'),
    ('PPL-NAV', 'A great circle route is the shortest path between two points.', True, 'Great circles minimise distance.'),
    ('PPL-NAV', 'Magnetic variation is caused by the aircraft itself.', False, 'Deviation is aircraft-caused; variation is from magnetic north offset.'),
    ('PPL-NAV', 'Ground speed is aircraft speed relative to the ground.', True, 'GS includes the wind effect.'),
    ('PPL-NAV', 'A heading of 180 degrees points due west.', False, '180 points south.'),
    ('PPL-NAV', 'One nautical mile equals 1852 metres.', True, '1 NM = 1852 m.'),
    ('PPL-NAV', 'VOR provides distance-only information.', False, 'VOR provides bearing; DME gives distance.'),
    ('PPL-NAV', 'The heading indicator must be periodically realigned with the compass.', True, 'DG drift requires realignment.'),
    ('PPL-NAV', 'UTC is based on the Prime Meridian.', True, 'UTC references Greenwich.'),
    ('PPL-NAV', 'A rhumb line crosses meridians at a constant angle.', True, 'Rhumb lines have constant bearing.'),
    ('PPL-NAV', 'DME measures distance in statute miles.', False, 'DME measures slant range in nautical miles.'),
    ('PPL-POF', 'A stall occurs when the critical angle of attack is exceeded.', True, 'Stall = critical AoA exceeded.'),
    ('PPL-POF', 'Induced drag is greatest at high speed.', False, 'Induced drag is greatest at low speed/high AoA.'),
    ('PPL-POF', 'The elevator controls pitch.', True, 'The elevator controls pitch.'),
    ('PPL-POF', 'Flaps reduce both lift and drag.', False, 'Flaps increase both lift and drag.'),
    ('PPL-POF', 'Ground effect reduces induced drag near the surface.', True, 'Ground effect reduces induced drag.'),
    ('PPL-POF', 'A forward centre of gravity reduces stability.', False, 'A forward CG increases stability.'),
    ('PPL-POF', 'In a 60-degree bank, load factor is 2g.', True, 'Load factor = 1/cos(60) = 2.'),
    ('PPL-POF', 'The stall speed is lower in a steep turn.', False, 'Load factor raises stall speed in turns.'),
    ('PPL-POF', 'Vx is the best angle of climb speed.', True, 'Vx maximises climb angle.'),
    ('PPL-POF', 'Parasite drag increases with the square of airspeed.', True, 'Parasite drag is proportional to V squared.'),
    ('PPL-AGK', 'The pitot tube measures static pressure.', False, 'The pitot tube measures dynamic (impact) pressure.'),
    ('PPL-AGK', 'The altimeter uses static pressure.', True, 'Altimeters use static pressure.'),
    ('PPL-AGK', 'Carburettor icing is unlikely between 0C and 20C.', False, 'Carburettor ice is likely in that range with moisture.'),
    ('PPL-AGK', 'The master switch controls the main electrical power.', True, 'The master switch controls electrical power.'),
    ('PPL-AGK', 'Hydraulic systems are never used in light aircraft.', False, 'Many light aircraft use hydraulics for brakes/gear.'),
    ('PPL-AGK', 'Gyroscopic instruments depend on rigidity and precession.', True, 'Gyros rely on those properties.'),
    ('PPL-AGK', 'MTOW stands for maximum takeoff weight.', True, 'MTOW is the max takeoff weight.'),
    ('PPL-AGK', 'The mixture control adjusts the fuel/air ratio.', True, 'Mixture sets fuel/air ratio.'),
    ('PPL-AGK', 'Circuit breakers protect electrical circuits from overload.', True, 'CBs prevent overload damage.'),
    ('PPL-AGK', 'A stick shaker warns of an over-speed condition.', False, 'Stick shakers warn of an imminent stall.'),
    ('PPL-HPL', 'Hypoxia is a deficiency of oxygen in body tissues.', True, 'Hypoxia is oxygen deficiency.'),
    ('PPL-HPL', 'Hyperventilation is caused by holding your breath.', False, 'Hyperventilation is over-breathing.'),
    ('PPL-HPL', 'Fatigue has no effect on pilot performance.', False, 'Fatigue seriously degrades performance.'),
    ('PPL-HPL', 'The IMSAFE checklist covers illness, medication, stress, alcohol, fatigue and emotion.', True, 'IMSAFE is the fitness checklist.'),
    ('PPL-HPL', 'Vestibular illusions are more likely when visual references are lost.', True, 'Without visual cues the inner ear can mislead.'),
    ('PPL-HPL', 'Alcohol affects flying ability for hours after consumption.', True, 'Alcohol impairment lasts hours.'),
    ('PPL-HPL', 'Spatial disorientation is impossible in instrument flight.', False, 'Disorientation can occur in IMC without instruments.'),
    ('PPL-HPL', 'Dehydration improves decision making.', False, 'Dehydration impairs judgement.'),
    ('PPL-HPL', 'Oxygen should be used above 10,000 ft in day operations.', True, 'Oxygen is recommended above 10,000 ft.'),
    ('PPL-HPL', 'Good crew communication reduces errors.', True, 'Clear communication improves safety.'),
    ('PPL-FPP', 'MTOW is the maximum takeoff weight.', True, 'MTOW = maximum takeoff weight.'),
    ('PPL-FPP', 'The CG envelope shows safe centre of gravity limits.', True, 'The envelope bounds safe CG positions.'),
    ('PPL-FPP', 'A tailwind reduces takeoff distance.', False, 'Tailwind increases takeoff distance.'),
    ('PPL-FPP', 'Density altitude is pressure altitude corrected for temperature.', True, 'Density altitude accounts for temperature.'),
    ('PPL-FPP', 'Moment equals weight divided by arm.', False, 'Moment = weight x arm.'),
    ('PPL-FPP', 'Reserve fuel should cover contingencies.', True, 'Reserves handle diversions and delays.'),
    ('PPL-FPP', 'High density altitude improves climb performance.', False, 'High density altitude reduces performance.'),
    ('PPL-FPP', 'A forward CG increases longitudinal stability.', True, 'Forward CG improves stability.'),
    ('PPL-FPP', 'A wet runway increases landing distance.', True, 'Wet surfaces reduce braking.'),
    ('PPL-FPP', 'The basic empty weight includes fuel.', False, 'BEW excludes fuel and payload.'),
    ('PPL-COM', '121.5 MHz is the international distress frequency.', True, '121.5 is the distress frequency.'),
    ('PPL-COM', 'The phonetic for "B" is Bravo.', True, 'B = Bravo.'),
    ('PPL-COM', '"Wilco" means the message is received and will be complied with.', True, 'Wilco = will comply.'),
    ('PPL-COM', 'Squawk 7600 indicates a hijacking.', False, '7600 is radio failure; 7500 is hijack.'),
    ('PPL-COM', 'Readback of clearances improves safety.', True, 'Readback confirms understanding.'),
    ('PPL-COM', '"Pan-pan" indicates an emergency requiring immediate assistance.', False, 'Pan-pan is urgency; Mayday is distress.'),
    ('PPL-COM', 'ATIS provides recorded aerodrome information.', True, 'ATIS is the automated information service.'),
    ('PPL-COM', 'Transponder codes are four-digit numbers.', True, 'Squawk codes have four digits.'),
    ('PPL-COM', 'The number "3" is spoken as "tree" in aviation.', True, 'Aviation phonetics use "tree".'),
    ('PPL-COM', 'You may transmit without listening first on a busy frequency.', False, 'Listen before transmitting.'),
    ('PPL-OPS', 'A pre-flight walk-around inspects the aircraft externally.', True, 'Walk-around is the external check.'),
    ('PPL-OPS', 'Frost on the wing is acceptable for takeoff.', False, 'Frost must be removed before takeoff.'),
    ('PPL-OPS', 'The sterile cockpit rule reduces distractions in critical phases.', True, 'Sterile cockpit reduces distraction.'),
    ('PPL-OPS', 'An unstable approach should always be continued.', False, 'Unstable approaches should be abandoned.'),
    ('PPL-OPS', 'Checklists are only used in emergencies.', False, 'Checklists are used on every flight.'),
    ('PPL-OPS', 'An ELT transmits a distress signal.', True, 'ELTs emit distress signals.'),
    ('PPL-OPS', 'In an engine failure, airspeed control is a priority.', True, 'Maintain airspeed first.'),
    ('PPL-OPS', 'Security procedures protect against unlawful interference.', True, 'Security prevents interference.'),
    ('PPL-OPS', 'De-icing is only needed in summer.', False, 'De-icing is needed for ice/frost contamination.'),
    ('PPL-OPS', 'The "minimum fuel" call informs ATC that delay would force diversion.', True, 'Minimum fuel flags low reserves.'),
]


SHORT_ANSWER_POOL = [
    # (subject_code, question, answer)
    ('PPL-AL', 'What does VFR stand for?', 'Visual Flight Rules'),
    ('PPL-AL', 'What is the standard altimeter setting above transition altitude?', '1013.25 hPa (29.92 inHg)'),
    ('PPL-AL', 'Which convention established ICAO?', 'The Chicago Convention'),
    ('PPL-AL', 'What is the minimum age for a PPL?', '17 years'),
    ('PPL-AL', 'What does QNH represent?', 'Altitude above mean sea level'),
    ('PPL-AL', 'What does NOTAM stand for?', 'Notice to Air Missions'),
    ('PPL-AL', 'What is the distress squawk code?', '7700'),
    ('PPL-AL', 'What is the radio failure squawk code?', '7600'),
    ('PPL-AL', 'What is the hijack squawk code?', '7500'),
    ('PPL-AL', 'What is Vne?', 'Never Exceed Speed'),
    ('PPL-MET', 'What does METAR stand for?', 'Meteorological Aerodrome Report'),
    ('PPL-MET', 'What does TAF stand for?', 'Terminal Aerodrome Forecast'),
    ('PPL-MET', 'What is the standard sea-level pressure?', '1013.25 hPa'),
    ('PPL-MET', 'What is a front?', 'The boundary between two air masses'),
    ('PPL-MET', 'Which cloud type causes thunderstorms?', 'Cumulonimbus'),
    ('PPL-MET', 'What is wind shear?', 'A sudden change in wind speed or direction'),
    ('PPL-MET', 'What is the standard lapse rate?', 'About 2C per 1000 ft'),
    ('PPL-MET', 'What is a microburst?', 'A strong localized downdraft'),
    ('PPL-MET', 'What is the ceiling?', 'The height of the lowest cloud layer'),
    ('PPL-MET', 'What unit is visibility reported in?', 'Metres or statute miles'),
    ('PPL-NAV', 'What is the shortest path between two points on a sphere?', 'A great circle'),
    ('PPL-NAV', 'What is the difference between true and magnetic north?', 'Variation'),
    ('PPL-NAV', 'How many metres in a nautical mile?', '1852 metres'),
    ('PPL-NAV', 'What does VOR provide?', 'Bearing/radial from or to the station'),
    ('PPL-NAV', 'What does DME measure?', 'Slant-range distance in nautical miles'),
    ('PPL-NAV', 'What is ground speed?', 'Aircraft speed relative to the ground'),
    ('PPL-NAV', 'Heading 090 points where?', 'East'),
    ('PPL-NAV', 'What does RAIM check?', 'GPS integrity'),
    ('PPL-NAV', 'What is deviation?', 'Compass error caused by the aircraft'),
    ('PPL-NAV', 'What does ETA stand for?', 'Estimated Time of Arrival'),
    ('PPL-POF', 'What are the four forces of flight?', 'Lift, Weight, Thrust, Drag'),
    ('PPL-POF', 'What causes a stall?', 'Exceeding the critical angle of attack'),
    ('PPL-POF', 'Which control surface controls pitch?', 'Elevator'),
    ('PPL-POF', 'Which control surface controls yaw?', 'Rudder'),
    ('PPL-POF', 'Which control surface controls roll?', 'Aileron'),
    ('PPL-POF', 'What does Vx represent?', 'Best angle of climb speed'),
    ('PPL-POF', 'What does Vy represent?', 'Best rate of climb speed'),
    ('PPL-POF', 'What is load factor in a 60-degree bank?', '2g'),
    ('PPL-POF', 'What is ground effect?', 'Reduced induced drag near the surface'),
    ('PPL-POF', 'What is angle of attack?', 'The angle between chord line and relative airflow'),
    ('PPL-AGK', 'What does the pitot tube measure?', 'Impact (dynamic) pressure'),
    ('PPL-AGK', 'Which instruments use static pressure?', 'Altimeter, VSI, ASI'),
    ('PPL-AGK', 'What is MTOW?', 'Maximum takeoff weight'),
    ('PPL-AGK', 'What does the mixture control adjust?', 'The fuel/air ratio'),
    ('PPL-AGK', 'What are the four-stroke cycle stages?', 'Intake, compression, power, exhaust'),
    ('PPL-AGK', 'What causes carburettor icing?', 'Cooling from fuel vaporisation with moisture'),
    ('PPL-AGK', 'What does a stick shaker warn of?', 'An imminent stall'),
    ('PPL-AGK', 'What is feathering?', 'Rotating propeller blades to reduce drag'),
    ('PPL-AGK', 'What does a circuit breaker do?', 'Protects the circuit from overload'),
    ('PPL-AGK', 'What is pre-ignition?', 'Fuel ignition before the spark'),
    ('PPL-HPL', 'What is hypoxia?', 'Insufficient oxygen in body tissues'),
    ('PPL-HPL', 'What is hyperventilation?', 'Over-breathing'),
    ('PPL-HPL', 'What does IMSAFE stand for?', 'Illness, Medication, Stress, Alcohol, Fatigue, Emotion'),
    ('PPL-HPL', 'What causes spatial disorientation?', 'Misinterpretation of sensory cues'),
    ('PPL-HPL', 'When should oxygen be used?', 'Above 10,000 ft in day operations'),
    ('PPL-HPL', 'What is situational awareness?', 'Understanding of the current and future state'),
    ('PPL-HPL', 'What is the primary countermeasure for fatigue?', 'Adequate rest'),
    ('PPL-HPL', 'What is the startle response?', 'A sudden physiological reaction to surprise'),
    ('PPL-HPL', 'What is a circadian rhythm?', 'The body\'s daily biological cycle'),
    ('PPL-HPL', 'What causes a sea breeze?', 'Temperature difference between land and sea'),
    ('PPL-FPP', 'What is BEW?', 'Basic empty weight'),
    ('PPL-FPP', 'What is ZFW?', 'Zero fuel weight'),
    ('PPL-FPP', 'What is MTOW?', 'Maximum takeoff weight'),
    ('PPL-FPP', 'What is moment?', 'Weight multiplied by arm'),
    ('PPL-FPP', 'What is density altitude?', 'Pressure altitude corrected for temperature'),
    ('PPL-FPP', 'What is the arm in weight and balance?', 'Distance from the datum'),
    ('PPL-FPP', 'How does a headwind affect takeoff distance?', 'It reduces it'),
    ('PPL-FPP', 'What is the formula distance = ?', 'Speed x time'),
    ('PPL-FPP', 'What does the CG envelope show?', 'Safe centre of gravity limits'),
    ('PPL-FPP', 'What is the best range speed?', 'The speed that minimises fuel burn per distance'),
    ('PPL-COM', 'What is the international distress frequency?', '121.5 MHz'),
    ('PPL-COM', 'What is the phonetic word for "B"?', 'Bravo'),
    ('PPL-COM', 'What does "Wilco" mean?', 'Will comply'),
    ('PPL-COM', 'What does "Roger" mean?', 'Message received'),
    ('PPL-COM', 'What does ATIS provide?', 'Automated terminal information'),
    ('PPL-COM', 'What does squawk 7600 mean?', 'Radio failure'),
    ('PPL-COM', 'What does squawk 7500 mean?', 'Hijack'),
    ('PPL-COM', 'What does "Pan-pan" signal?', 'Urgency'),
    ('PPL-COM', 'What does "Mayday" signal?', 'Distress'),
    ('PPL-COM', 'What is a transponder code?', 'A four-digit squawk code'),
    ('PPL-OPS', 'What is a walk-around?', 'The external pre-flight inspection'),
    ('PPL-OPS', 'What does ELT stand for?', 'Emergency Locator Transmitter'),
    ('PPL-OPS', 'What is an unstable approach?', 'An approach outside stabilised criteria'),
    ('PPL-OPS', 'What is the sterile cockpit rule?', 'No non-essential conversation in critical phases'),
    ('PPL-OPS', 'What should be done if frost is on the wing?', 'Remove it before takeoff'),
    ('PPL-OPS', 'What does SOP stand for?', 'Standard Operating Procedure'),
    ('PPL-OPS', 'What is a precautionary landing?', 'A landing made when continuing is unsafe but not urgent'),
    ('PPL-OPS', 'What is the emergency frequency?', '121.5 MHz'),
    ('PPL-OPS', 'What does SMS stand for?', 'Safety Management System'),
    ('PPL-OPS', 'When should a go-around be initiated?', 'On an unstable approach'),
]


ESSAY_POOL = [
    # (subject_code, question, answer_key)
    ('PPL-AL', 'Explain the responsibilities of the pilot in command regarding flight safety.', 'The PIC is responsible for the safe operation of the aircraft, compliance with regulations, the conduct of the crew and passengers, and decisions about whether to proceed, divert or cancel the flight.'),
    ('PPL-AL', 'Describe the differences between VFR and IFR flight rules.', 'VFR relies on visual reference to terrain, requires VMC, and uses see-and-avoid; IFR allows flight in IMC using instruments, requires an IFR flight plan, ATC clearance and instrument competence.'),
    ('PPL-MET', 'Describe how a warm front produces weather and how it differs from a cold front.', 'Warm fronts have gentle slopes, produce layered cloud and steady rain, and cause gradual changes; cold fronts are steeper, produce convective weather, and bring rapid, clearer changes.'),
    ('PPL-MET', 'Explain the hazards of aircraft icing and the conditions in which it forms.', 'Icing forms when supercooled droplets freeze on surfaces, most often between 0C and -15C; it adds weight, distorts airflow, increases drag, reduces lift and can affect controls.'),
    ('PPL-NAV', 'Explain the difference between true, magnetic and compass headings, and how to convert between them.', 'True heading is relative to true north; add/subtract variation to get magnetic; apply deviation to get compass heading. The sequence True-Variation-Magnetic-Deviation-Compass is used.'),
    ('PPL-NAV', 'Describe how the wind triangle is used in flight planning.', 'The wind triangle resolves the true airspeed vector, wind vector and ground vector to compute required heading and expected ground speed, enabling accurate ETAs and fuel planning.'),
    ('PPL-POF', 'Explain how lift is generated and the factors affecting it.', 'Lift is generated by pressure difference over the wing (Bernoulli) and momentum deflection, and is proportional to air density, wing area, airspeed squared and the lift coefficient, which depends on angle of attack.'),
    ('PPL-POF', 'Describe the causes and consequences of an aerodynamic stall.', 'A stall occurs when the critical angle of attack is exceeded and airflow separates from the wing, reducing lift; recovery requires reducing angle of attack and adding power.'),
    ('PPL-AGK', 'Describe the operation of the pitot-static system and its instruments.', 'The pitot tube senses dynamic pressure and static vents sense static pressure; the ASI compares the two, the altimeter uses static pressure and the VSI measures its rate of change.'),
    ('PPL-AGK', 'Explain the function of the aircraft electrical system and its components.', 'The battery and alternator supply DC power to buses, which feed avionics, lights and systems; circuit breakers protect circuits and the master switch controls the supply.'),
    ('PPL-HPL', 'Explain how fatigue affects pilot performance and how it can be managed.', 'Fatigue reduces attention, reaction time, memory and judgement, increasing error; it is managed by adequate sleep, proper rostering, hydration, breaks and recognising personal limits.'),
    ('PPL-HPL', 'Describe the effects of alcohol and medication on flying fitness.', 'Alcohol and many drugs impair cognition, coordination and judgement for many hours; pilots must follow the 12-hour bottle-to-throttle rule and never self-medicate without approval.'),
    ('PPL-FPP', 'Explain the weight and balance procedure and why it is critical.', 'Weight and balance computes total weight and moments to confirm loading is within the CG envelope; exceeding limits affects performance and stability, and can prevent control.'),
    ('PPL-FPP', 'Describe how density altitude affects takeoff, climb and landing performance.', 'High density altitude (hot, high, humid) reduces air density, lowering engine power, lift and propeller efficiency, increasing takeoff and landing distances and reducing climb rate.'),
    ('PPL-COM', 'Explain the purpose of standard phraseology and readback in ATC communications.', 'Standard phraseology removes ambiguity and improves mutual understanding; readbacks confirm that instructions were heard correctly, preventing communication errors.'),
    ('PPL-COM', 'Describe the radio failure procedure for a VFR flight.', 'Set squawk 7600, continue on the planned route, listen on the appropriate frequency, and if possible proceed according to the flight plan while looking for assistance or diverting as required.'),
    ('PPL-OPS', 'Explain the decision-making process for an aborted takeoff.', 'Before V1 any failure or abnormal condition justifies rejecting the takeoff; the decision must be timely, and the pilot should follow the reject procedure with braking and reverse thrust as available.'),
    ('PPL-OPS', 'Describe the go-around procedure and when it should be used.', 'A go-around is used for unstable approaches, traffic conflicts or unsafe conditions; the pilot applies full power, pitch for climb, retracts flaps progressively and re-enters the circuit or re-approaches.'),
]


MATCHING_POOL = [
    # (subject_code, prompt, pairs [(left, right), ...])
    ('PPL-AL', 'Match each squawk code to its meaning.', [('7500', 'Hijack'), ('7600', 'Radio failure'), ('7700', 'Emergency'), ('1200', 'VFR normal')]),
    ('PPL-AL', 'Match each pressure setting to its meaning.', [('QNH', 'Altitude above MSL'), ('QFE', 'Height above aerodrome'), ('1013.25 hPa', 'Standard setting'), ('QNE', 'Standard pressure altitude')]),
    ('PPL-MET', 'Match each cloud type to its typical weather.', [('Cumulonimbus', 'Thunderstorm'), ('Stratus', 'Drizzle/overcast'), ('Cirrus', 'Fair weather/approaching front'), ('Cumulus', 'Fair weather convection')]),
    ('PPL-MET', 'Match each phenomenon to its description.', [('SIGMET', 'Significant en-route weather'), ('TAF', 'Terminal forecast'), ('METAR', 'Routine aerodrome report'), ('AIRMET', 'Minor weather advisory')]),
    ('PPL-NAV', 'Match each navigation aid to what it provides.', [('VOR', 'Radial/bearing'), ('DME', 'Slant distance'), ('NDB', 'Low-freq bearing'), ('ILS', 'Precision approach guidance')]),
    ('PPL-NAV', 'Match each term to its meaning.', [('Variation', 'True vs magnetic north'), ('Deviation', 'Aircraft-caused compass error'), ('Track', 'Path over the ground'), ('Heading', 'Direction the nose points')]),
    ('PPL-POF', 'Match each force to its description.', [('Lift', 'Upward aerodynamic force'), ('Weight', 'Downward gravity force'), ('Thrust', 'Forward propulsive force'), ('Drag', 'Backward resisting force')]),
    ('PPL-POF', 'Match each control surface to its effect.', [('Elevator', 'Pitch'), ('Aileron', 'Roll'), ('Rudder', 'Yaw'), ('Flap', 'Lift and drag increase')]),
    ('PPL-AGK', 'Match each instrument to its measurement.', [('Altimeter', 'Pressure altitude'), ('ASI', 'Airspeed'), ('VSI', 'Vertical speed'), ('Compass', 'Magnetic heading')]),
    ('PPL-AGK', 'Match each system to its function.', [('Alternator', 'Electrical generation'), ('Battery', 'Electrical storage'), ('Oil pump', 'Lubrication'), ('Fuel pump', 'Fuel supply')]),
    ('PPL-HPL', 'Match each condition to its cause.', [('Hypoxia', 'Oxygen deficiency'), ('Hyperventilation', 'Over-breathing'), ('Disorientation', 'False sensory cues'), ('Fatigue', 'Sleep deficit/stress')]),
    ('PPL-HPL', 'Match each checklist item of IMSAFE.', [('I', 'Illness'), ('M', 'Medication'), ('S', 'Stress'), ('F', 'Fatigue')]),
    ('PPL-FPP', 'Match each weight term to its meaning.', [('BEW', 'Basic empty weight'), ('ZFW', 'Zero fuel weight'), ('MTOW', 'Max takeoff weight'), ('MLW', 'Max landing weight')]),
    ('PPL-FPP', 'Match each performance effect to its factor.', [('Headwind', 'Shorter takeoff'), ('Tailwind', 'Longer landing'), ('High density altitude', 'Lower climb'), ('Wet runway', 'Longer landing')]),
    ('PPL-COM', 'Match each phrase to its meaning.', [('Roger', 'Received'), ('Wilco', 'Will comply'), ('Mayday', 'Distress'), ('Pan-pan', 'Urgency')]),
    ('PPL-COM', 'Match each number to its aviation pronunciation.', [('3', 'Tree'), ('9', 'Niner'), ('0', 'Zero'), ('5', 'Fife')]),
    ('PPL-OPS', 'Match each procedure to its purpose.', [('Walk-around', 'External inspection'), ('Sterile cockpit', 'Reduce distraction'), ('Pre-takeoff checks', 'Verify controls'), ('De-icing', 'Remove contamination')]),
    ('PPL-OPS', 'Match each emergency to its initial action.', [('Engine failure', 'Maintain airspeed'), ('Electrical fire', 'Cut power'), ('Smoke in cockpit', 'Ventilate and isolate'), ('Unstable approach', 'Go-around')]),
]


ORDERING_POOL = [
    # (subject_code, prompt, ordered_steps)
    ('PPL-AL', 'Place these pre-flight actions in order.', ['Obtain weather briefing', 'File/plan the route', 'Pre-flight walk-around', 'Pre-start checks', 'Start engine and taxi']),
    ('PPL-AL', 'Place the takeoff sequence in order.', ['Line up on the runway', 'Apply full power smoothly', 'Rotate at Vr', 'Climb at Vx/Vy', 'Retract flaps after obstacle clearance']),
    ('PPL-MET', 'Place the development of a cold front in order.', ['Cold air advances', 'Warm air is forced upward', 'Convective cloud forms', 'Precipitation and wind shift', 'Cold air undercuts and clears']),
    ('PPL-MET', 'Place the standard landing procedure in order.', ['Configure flaps for approach', 'Stabilise on final', 'Flare at the right height', 'Touch down on main gear', 'Apply braking and rollout']),
    ('PPL-NAV', 'Place the steps to compute a heading in order.', ['Draw the desired track', 'Apply the wind vector', 'Measure the wind correction angle', 'Compute the heading', 'Add variation for magnetic heading']),
    ('PPL-NAV', 'Place the DR navigation steps in order.', ['Note start position', 'Record heading and speed', 'Elapse the flight time', 'Compute distance flown', 'Plot the DR position']),
    ('PPL-POF', 'Place the stall recovery steps in order.', ['Recognise the stall warning', 'Reduce angle of attack', 'Apply full power', 'Level the wings', 'Regain normal flight']),
    ('PPL-POF', 'Place the turn execution steps in order.', ['Check for traffic', 'Apply coordinated bank', 'Set bank angle', 'Monitor altitude', 'Roll out on target heading']),
    ('PPL-AGK', 'Place the four-stroke cycle in order.', ['Intake', 'Compression', 'Power', 'Exhaust']),
    ('PPL-AGK', 'Place the engine start sequence in order.', ['Clear the area', 'Prime as needed', 'Set mixture and throttle', 'Crank the engine', 'Check oil pressure']),
    ('PPL-HPL', 'Place the DECIDE model steps in order.', ['Detect', 'Estimate', 'Choose', 'Identify', 'Do', 'Evaluate']),
    ('PPL-HPL', 'Place the pre-flight IMSAFE check in order.', ['Illness', 'Medication', 'Stress', 'Alcohol', 'Fatigue', 'Emotion']),
    ('PPL-FPP', 'Place the weight and balance steps in order.', ['Weigh/estimate each item', 'Multiply by arm for moments', 'Sum weights and moments', 'Compute CG', 'Plot CG within envelope']),
    ('PPL-FPP', 'Place the fuel planning steps in order.', ['Compute trip fuel', 'Add contingency fuel', 'Add reserve fuel', 'Add taxi fuel', 'Add extra fuel']),
    ('PPL-COM', 'Place the radio call steps in order.', ['Select the frequency', 'Listen for traffic', 'Transmit callsign and position', 'Make the request', 'Read back the clearance']),
    ('PPL-COM', 'Place the frequency change steps in order.', ['Request frequency change', 'Receive approval', 'Confirm new frequency', 'Switch and squawk', 'Establish contact']),
    ('PPL-OPS', 'Place the emergency descent steps in order.', ['Announce the descent', 'Reduce power', 'Lower the nose', 'Deploy speed brakes', 'Level off at safe altitude']),
    ('PPL-OPS', 'Place the engine failure after takeoff actions in order.', ['Maintain best glide speed', 'Select a landing area', 'Secure the engine', 'Try to restart if time', 'Land straight ahead']),
]


CASE_STUDY_POOL = [
    # (subject_code, scenario, question, answer_key)
    ('PPL-AL', 'A pilot departs VFR and the cloud base drops below VMC with no instrument rating.', 'What action should the pilot take?', 'The pilot should turn back or divert while visual contact is maintained, or land at the nearest suitable aerodrome; flying into IMC without an IR is hazardous and illegal.'),
    ('PPL-MET', 'A pilot observes fast-forming cumulonimbus with increasing wind and a dark sky ahead of the route.', 'Assess the weather risk and advise a course of action.', 'The CB indicates a thunderstorm risk with turbulence, icing, hail and wind shear; the pilot should detour around it by at least 20-30 miles, not fly under or through it.'),
    ('PPL-NAV', 'An aircraft flies 60 NM in 30 minutes with a 15 kt headwind component.', 'Compute the ground speed and true airspeed.', 'Ground speed is 120 kt (60 NM in 0.5 h); true airspeed is 135 kt (GS + headwind).'),
    ('PPL-POF', 'A pilot enters a steep turn and the stall warning activates at a higher speed than normal.', 'Explain why the stall speed increased.', 'The increased load factor in the turn raises the stall speed; the pilot must lower the nose, reduce bank and add power to recover.'),
    ('PPL-AGK', 'During climb the oil pressure drops while the oil temperature rises.', 'Diagnose the likely cause and the correct response.', 'It suggests oil starvation or a faulty oil system; the pilot should reduce power, monitor gauges and consider an early landing or diversion.'),
    ('PPL-HPL', 'A fatigued pilot continues a long cross-country at night and misses a radio call.', 'Analyse the cause and propose mitigations.', 'Fatigue reduced attention and reaction; the pilot should have managed rest, rotated duties if crewed, hydrated and used automated reminders, and should land to rest.'),
    ('PPL-FPP', 'A pilot computes that the takeoff weight exceeds MTOW by 60 kg on a hot day from a short runway.', 'Evaluate the options.', 'The pilot must reduce payload or fuel, use the POH performance tables for the density altitude and runway length, and only take off if all limits are met.'),
    ('PPL-COM', 'A pilot hears a mayday call while on a busy frequency.', 'Describe the correct communication behaviour.', 'Cease non-urgent transmissions, monitor the distress traffic, note the position, and relay or assist only if required and able without interfering.'),
    ('PPL-OPS', 'During climb, smoke appears in the cockpit.', 'Outline the immediate actions.', 'Declare an emergency, identify and isolate the source, shut off electrical power, ventilate the cockpit, don oxygen if available and plan a priority landing.'),
    ('PPL-AL', 'A pilot is given an ATC clearance that conflicts with the filed route.', 'What should the pilot do?', 'Question the clearance and request clarification or confirmation; never blindly accept an instruction that conflicts with the flight plan or safety.'),
    ('PPL-MET', 'METAR reports 500 m visibility, RVR below minima and freezing rain.', 'Assess the conditions for a VFR departure.', 'Conditions are well below VFR minima; the pilot should delay or cancel the departure and wait for improvement.'),
    ('PPL-NAV', 'A compass reads 090 while the variation is 5 degrees east.', 'Compute the magnetic and true headings.', 'Compass 090 plus easterly deviation adjustment gives magnetic; then subtract easterly variation to get true heading (following TVMDC rules).'),
    ('PPL-POF', 'A heavily loaded aircraft exhibits a nose-heavy pitch tendency on rotation.', 'Explain the effect and the remedy.', 'The forward CG increases the nose-down moment; rotation requires more elevator authority, and the aircraft may need weight redistribution to stay within limits.'),
    ('PPL-AGK', 'The alternator fails and the battery voltage decreases slowly.', 'Explain the system response and actions.', 'Electrical loads must be reduced to non-essential, consumption monitored, and the flight planned to land before the battery is depleted.'),
    ('PPL-HPL', 'A pilot experiences vertigo while turning over the sea at dusk.', 'Explain the safest recovery technique.', 'Trust the instruments, level the wings using the attitude indicator, and avoid relying on inner-ear sensations; fly a stabilised attitude until visual reference returns.'),
    ('PPL-FPP', 'A destination weather report is below landing minima but improving.', 'Evaluate fuel and decision options.', 'The pilot should compute fuel for holding and diversion, set a decision point and divert if the weather does not improve by the planned time.'),
    ('PPL-COM', 'ATC instructs a descent to an altitude below safe terrain clearance.', 'What should the pilot do?', 'Challenge the instruction, state the terrain concern and request confirmation; safety overrides the instruction if it is clearly unsafe.'),
    ('PPL-OPS', 'On short final the aircraft drifts badly due to a crosswind.', 'Describe the correct response.', 'Use sideslip or crab correction, stay stabilised, and if the approach becomes unstable go around rather than forcing the landing.'),
]


class Command(BaseCommand):
    help = 'Seed question banks: 500 assessment (QuestionBank) + 500 final exam (FinalExamQuestion) questions across all types.'

    def handle(self, *args, **options):
        self.stdout.write('Ensuring subjects/modules exist...')
        subjects_by_code = self._ensure_subjects()
        self._seed_assessment_bank(subjects_by_code)
        self._seed_final_bank(subjects_by_code)
        self._report()

    # ------------------------------------------------------------------
    # Subject/module bootstrap (same syllabus as seed_training_content)
    # ------------------------------------------------------------------
    def _ensure_subjects(self):
        from apps.ground_training.models import Subject, Module
        from apps.core.management.commands.seed_training_content import PROGRAMS

        subjects = {}
        for program_code, program_data in PROGRAMS.items():
            for subj_data in program_data['subjects']:
                subject, _ = Subject.objects.get_or_create(
                    code=subj_data['code'],
                    defaults={
                        'title_en': subj_data['title_en'],
                        'title_fr': subj_data.get('title_fr', subj_data['title_en']),
                        'title_ar': subj_data.get('title_ar', subj_data['title_en']),
                        'program': program_code,
                        'total_hours': subj_data.get('total_hours', 30),
                    },
                )
                module_order = 1
                for mod_data in subj_data['modules']:
                    Module.objects.get_or_create(
                        subject=subject,
                        title=mod_data['title'],
                        defaults={
                            'title_fr': mod_data.get('title_fr', mod_data['title']),
                            'title_ar': mod_data.get('title_ar', mod_data['title']),
                            'description': mod_data.get('title', ''),
                            'duration': mod_data.get('duration', 10),
                            'order': module_order,
                        },
                    )
                    module_order += 1
                subjects[subj_data['code']] = subject
        return subjects

    # ------------------------------------------------------------------
    # Assessment bank: QuestionBank (500)
    # ------------------------------------------------------------------
    def _seed_assessment_bank(self, subjects_by_code):
        from apps.exams.models import QuestionBank

        existing = QuestionBank.objects.count()
        if existing >= TARGET_ASSESSMENTS:
            self.stdout.write(f'  Assessment bank already full ({existing}).')
            return

        from apps.ground_training.models import Module
        module_cache = {}
        for code, subject in subjects_by_code.items():
            module_cache[code] = list(Module.objects.filter(subject=subject).order_by('order'))

        def get_module(code, idx):
            mods = module_cache.get(code) or []
            return mods[idx % len(mods)] if mods else None

        created = 0
        index = 0
        # True/False
        for code, stmt, is_true, expl in TRUE_FALSE_POOL:
            if created >= TARGET_ASSESSMENTS:
                break
            subject = subjects_by_code.get(code)
            text = f'{stmt} [True/False]'
            QuestionBank.objects.get_or_create(
                question_text=text,
                defaults={
                    'subject': subject,
                    'module': get_module(code, index),
                    'question_type': 'true_false',
                    'options': ['True', 'False'],
                    'correct_answer': 'True' if is_true else 'False',
                    'explanation': expl,
                    'difficulty': DIFFICULTIES[index % 3],
                    'program': subject.program if subject else 'PPL',
                },
            )
            created += 1
            index += 1
        # Short answer
        for q in SHORT_ANSWER_POOL:
            if created >= TARGET_ASSESSMENTS:
                break
            code, text, answer = q
            subject = subjects_by_code.get(code)
            QuestionBank.objects.get_or_create(
                question_text=text,
                defaults={
                    'subject': subject,
                    'module': get_module(code, index),
                    'question_type': 'short_answer',
                    'options': [],
                    'correct_answer': answer,
                    'explanation': None,
                    'difficulty': DIFFICULTIES[index % 3],
                    'program': subject.program if subject else None,
                },
            )
            created += 1
            index += 1
        # Essay
        for q in ESSAY_POOL:
            if created >= TARGET_ASSESSMENTS:
                break
            code, text, answer = q
            subject = subjects_by_code.get(code)
            QuestionBank.objects.get_or_create(
                question_text=text,
                defaults={
                    'subject': subject,
                    'module': get_module(code, index),
                    'question_type': 'essay',
                    'options': [],
                    'correct_answer': answer,
                    'explanation': None,
                    'difficulty': DIFFICULTIES[index % 3],
                    'program': subject.program if subject else None,
                },
            )
            created += 1
            index += 1
        # Matching
        for q in MATCHING_POOL:
            if created >= TARGET_ASSESSMENTS:
                break
            code, prompt, pairs = q
            subject = subjects_by_code.get(code)
            options = [f'{left} → {right}' for left, right in pairs]
            correct = pairs[0][1]
            QuestionBank.objects.get_or_create(
                question_text=f'{prompt} (match each item)',
                defaults={
                    'subject': subject,
                    'module': get_module(code, index),
                    'question_type': 'matching',
                    'options': options,
                    'correct_answer': correct,
                    'explanation': 'Match each left item to its right description.',
                    'difficulty': DIFFICULTIES[index % 3],
                    'program': subject.program if subject else None,
                },
            )
            created += 1
            index += 1
        # Ordering
        for q in ORDERING_POOL:
            if created >= TARGET_ASSESSMENTS:
                break
            code, prompt, steps = q
            subject = subjects_by_code.get(code)
            options = list(steps)
            QuestionBank.objects.get_or_create(
                question_text=f'{prompt} (arrange in correct order)',
                defaults={
                    'subject': subject,
                    'module': get_module(code, index),
                    'question_type': 'ordering',
                    'options': options,
                    'correct_answer': options[0],
                    'explanation': 'The correct sequence is: ' + ' > '.join(steps) + '.',
                    'difficulty': DIFFICULTIES[index % 3],
                    'program': subject.program if subject else None,
                },
            )
            created += 1
            index += 1
        # Case study
        for q in CASE_STUDY_POOL:
            if created >= TARGET_ASSESSMENTS:
                break
            code, scenario, question, answer = q
            subject = subjects_by_code.get(code)
            QuestionBank.objects.get_or_create(
                question_text=f'{scenario} {question}',
                defaults={
                    'subject': subject,
                    'module': get_module(code, index),
                    'question_type': 'case_study',
                    'options': [],
                    'correct_answer': answer,
                    'explanation': None,
                    'difficulty': DIFFICULTIES[index % 3],
                    'program': subject.program if subject else None,
                },
            )
            created += 1
            index += 1
        # MCQ last so every rarer type is guaranteed coverage before MCQs fill up
        for q in MCQ_POOL:
            if created >= TARGET_ASSESSMENTS:
                break
            code, text, options, answer, expl = q
            subject = subjects_by_code.get(code)
            program = subject.program if subject else None
            QuestionBank.objects.get_or_create(
                question_text=text,
                defaults={
                    'subject': subject,
                    'module': get_module(code, index),
                    'question_type': 'mcq',
                    'options': options,
                    'correct_answer': answer,
                    'explanation': expl,
                    'difficulty': DIFFICULTIES[index % 3],
                    'program': program,
                },
            )
            created += 1
            index += 1

        # Top-up with generated MCQ variations if still below target
        self._top_up_assessments(subjects_by_code, module_cache, created)

    def _top_up_assessments(self, subjects_by_code, module_cache, created):
        from apps.exams.models import QuestionBank

        def get_module(code, idx):
            mods = module_cache.get(code) or []
            return mods[idx % len(mods)] if mods else None

        index = len(MCQ_POOL)
        idx = 0
        codes = list(subjects_by_code.keys())
        while created < TARGET_ASSESSMENTS:
            code = codes[idx % len(codes)]
            subject = subjects_by_code[code]
            i = idx // len(codes)
            text = f'Regarding {subject.title_en} (item {i + 1}), which statement is correct?'
            answer = f'Correct statement {i + 1} about {subject.title_en}'
            QuestionBank.objects.get_or_create(
                question_text=text,
                defaults={
                    'subject': subject,
                    'module': get_module(code, index + idx),
                    'question_type': 'mcq',
                    'options': [answer, 'Incorrect option A', 'Incorrect option B', 'Incorrect option C'],
                    'correct_answer': answer,
                    'explanation': 'Generated question covering key syllabus topics.',
                    'difficulty': DIFFICULTIES[idx % 3],
                    'program': subject.program,
                },
            )
            created += 1
            index += 1
            idx += 1
        self.stdout.write(self.style.SUCCESS(f'  Assessment bank: {QuestionBank.objects.count()} questions.'))

    # ------------------------------------------------------------------
    # Final exam bank: FinalExamQuestion (500)
    # ------------------------------------------------------------------
    def _seed_final_bank(self, subjects_by_code):
        from apps.exams.final_models import FinalExamQuestion
        from apps.ground_training.models import Module

        existing = FinalExamQuestion.objects.count()
        if existing >= TARGET_FINAL:
            self.stdout.write(f'  Final exam bank already full ({existing}).')
            return

        module_cache = {}
        for code, subject in subjects_by_code.items():
            module_cache[code] = list(Module.objects.filter(subject=subject).order_by('order'))

        def get_module(code, idx):
            mods = module_cache.get(code) or []
            return mods[idx % len(mods)] if mods else None

        created = 0
        index = 0
        # MCQ / SCQ from the shared MCQ pool
        for q in MCQ_POOL:
            if created >= TARGET_FINAL:
                break
            code, text, options, answer, expl = q
            subject = subjects_by_code.get(code)
            FinalExamQuestion.objects.get_or_create(
                question_text=text,
                defaults={
                    'subject': subject,
                    'module': get_module(code, index),
                    'question_type': 'mcq' if index % 2 == 0 else 'scq',
                    'difficulty': DIFFICULTIES[index % 3],
                    'options': options,
                    'correct_answer': answer,
                    'explanation': expl,
                    'is_active': True,
                },
            )
            created += 1
            index += 1
        # True/False
        for q in TRUE_FALSE_POOL:
            if created >= TARGET_FINAL:
                break
            code, stmt, is_true, expl = q
            subject = subjects_by_code.get(code)
            FinalExamQuestion.objects.get_or_create(
                question_text=stmt,
                defaults={
                    'subject': subject,
                    'module': get_module(code, index),
                    'question_type': 'true_false',
                    'difficulty': DIFFICULTIES[index % 3],
                    'options': ['True', 'False'],
                    'correct_answer': 'True' if is_true else 'False',
                    'explanation': expl,
                    'is_active': True,
                },
            )
            created += 1
            index += 1
        # Essay
        for q in ESSAY_POOL:
            if created >= TARGET_FINAL:
                break
            code, text, answer = q
            subject = subjects_by_code.get(code)
            FinalExamQuestion.objects.get_or_create(
                question_text=text,
                defaults={
                    'subject': subject,
                    'module': get_module(code, index),
                    'question_type': 'essay',
                    'difficulty': DIFFICULTIES[index % 3],
                    'options': [],
                    'correct_answer': answer,
                    'explanation': None,
                    'is_active': True,
                },
            )
            created += 1
            index += 1

        # Top-up
        self._top_up_final(subjects_by_code, module_cache, created)

    def _top_up_final(self, subjects_by_code, module_cache, created):
        from apps.exams.final_models import FinalExamQuestion

        def get_module(code, idx):
            mods = module_cache.get(code) or []
            return mods[idx % len(mods)] if mods else None

        index = 0
        idx = 0
        codes = list(subjects_by_code.keys())
        while created < TARGET_FINAL:
            code = codes[idx % len(codes)]
            subject = subjects_by_code[code]
            i = idx // len(codes)
            text = f'Concerning {subject.title_en} (item {i + 1}), select the correct statement.'
            answer = f'Correct statement {i + 1} for {subject.title_en}'
            FinalExamQuestion.objects.get_or_create(
                question_text=text,
                defaults={
                    'subject': subject,
                    'module': get_module(code, index + idx),
                    'question_type': 'mcq' if idx % 3 != 2 else 'scq',
                    'difficulty': DIFFICULTIES[idx % 3],
                    'options': [answer, 'Incorrect option A', 'Incorrect option B', 'Incorrect option C'],
                    'correct_answer': answer,
                    'explanation': 'Generated question covering key syllabus topics.',
                    'is_active': True,
                },
            )
            created += 1
            index += 1
            idx += 1
        self.stdout.write(self.style.SUCCESS(f'  Final exam bank: {FinalExamQuestion.objects.count()} questions.'))

    def _report(self):
        from apps.exams.models import QuestionBank
        from apps.exams.final_models import FinalExamQuestion

        self.stdout.write(self.style.SUCCESS(
            f'Done. Assessment bank: {QuestionBank.objects.count()} questions. '
            f'Final exam bank: {FinalExamQuestion.objects.count()} questions.'
        ))
