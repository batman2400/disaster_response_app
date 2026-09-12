export type SupportedLanguage = "en" | "si" | "ta";

export interface TranslationDictionary {
  // Navigation & Branding
  brand_name: string;
  sub_brand: string;
  system_live: string;
  live_map: string;
  report_hazard: string;
  emergency_sos: string;
  language_selector: string;

  // Roles
  citizen: string;
  council_officer: string;
  field_crew: string;
  relief_desk: string;
  open_desk: string;
  exit_session: string;

  // Hazard Categories
  cat_flood: string;
  cat_electrical: string;
  cat_tree: string;
  cat_road_blocked: string;
  cat_landslide: string;
  cat_drainage: string;
  cat_structural: string;
  cat_help: string;

  // Urgency
  urgency_critical: string;
  urgency_medium: string;
  urgency_low: string;

  // Statuses
  status_pending: string;
  status_published: string;
  status_need_info: string;
  status_area_alert: string;
  status_council_ticket: string;
  status_resolved: string;

  // Report Form
  report_title: string;
  report_subtitle: string;
  take_photo: string;
  retake_photo: string;
  change_photo: string;
  category_label: string;
  ward_label: string;
  description_label: string;
  description_placeholder: string;
  location_label: string;
  detect_gps: string;
  gps_detected: string;
  submit_report: string;
  submitting: string;
  analyzing_pipeline: string;

  // Public Map
  shelters_btn: string;
  safe_corridors_btn: string;
  free_beds: string;
  confirm_hazard: string;
  confirmed: string;
  evacuation_route: string;
  legend: string;

  // Actions
  export_sitrep: string;
  emergency_broadcast: string;
  print_report: string;
  download_csv: string;
  close: string;
  call: string;
}

export const TRANSLATIONS: Record<SupportedLanguage, TranslationDictionary> = {
  en: {
    brand_name: "Fender Response",
    sub_brand: "NDRRMS · Colombo Municipal Council",
    system_live: "System Live · Kelani Basin Active",
    live_map: "Live Map",
    report_hazard: "Report Hazard",
    emergency_sos: "SOS 117",
    language_selector: "Language",

    citizen: "Citizen Portal",
    council_officer: "Council Officer Desk",
    field_crew: "Field Crew Portal",
    relief_desk: "Relief Logistics Desk",
    open_desk: "Open Desk",
    exit_session: "Exit",

    cat_flood: "Flood & Water Accumulation",
    cat_electrical: "Electrical Hazard & Fallen Cables",
    cat_tree: "Fallen Tree & Road Obstruction",
    cat_road_blocked: "Blocked Road / Culvert Failure",
    cat_landslide: "Landslide / Slope Instability",
    cat_drainage: "Drainage Overflow & Silt Jam",
    cat_structural: "Structural Damage / Collapse Risk",
    cat_help: "Stranded Citizen / Emergency Relief",

    urgency_critical: "Critical",
    urgency_medium: "Medium",
    urgency_low: "Low",

    status_pending: "Pending AI",
    status_published: "Verified & Published",
    status_need_info: "Need Info",
    status_area_alert: "Area Alert",
    status_council_ticket: "Council Ticket",
    status_resolved: "Resolved",

    report_title: "Report Flood Hazard",
    report_subtitle: "Instant AI verification with Colombo emergency services triage.",
    take_photo: "Capture or Upload Photo",
    retake_photo: "Retake Photo",
    change_photo: "Change Photo",
    category_label: "Hazard Category",
    ward_label: "Colombo Municipal Ward",
    description_label: "Description (Optional)",
    description_placeholder: "e.g., Water rising rapidly over curb, 2 cars stranded...",
    location_label: "Incident Location (GPS)",
    detect_gps: "Auto-detect My Location",
    gps_detected: "GPS Location Acquired",
    submit_report: "Submit Verified Report",
    submitting: "Submitting to AI Pipeline...",
    analyzing_pipeline: "Running 5-Check Verification Pipeline...",

    shelters_btn: "Shelters",
    safe_corridors_btn: "Safe Corridors",
    free_beds: "free beds",
    confirm_hazard: "Confirm Hazard (I am here)",
    confirmed: "Confirmed by You",
    evacuation_route: "Safe Evacuation Corridor",
    legend: "Map Legend",

    export_sitrep: "Export SitRep",
    emergency_broadcast: "Emergency Broadcast",
    print_report: "Print / Save PDF",
    download_csv: "Download CSV",
    close: "Close",
    call: "Call",
  },

  si: {
    brand_name: "ෆෙන්ඩර් ආපදා සහන",
    sub_brand: "NDRRMS · කොළඹ මහ නගර සභාව",
    system_live: "පද්ධතිය සක්‍රියයි · කැලණි නිම්නය",
    live_map: "සජීවී සිතියම",
    report_hazard: "අනතුරක් වාර්තා කරන්න",
    emergency_sos: "හදිසි 117",
    language_selector: "භාෂාව",

    citizen: "පුරවැසි සේවාව",
    council_officer: "නාගරික නිලධාරී කවුළුව",
    field_crew: "ක්ෂේත්‍ර කාර්ය මණ්ඩලය",
    relief_desk: "සහන සේවා මෙහෙයුම්",
    open_desk: "කවුළුව විවෘත කරන්න",
    exit_session: "ඉවත් වන්න",

    cat_flood: "ගංවතුර සහ ජල ගැලීම්",
    cat_electrical: "විදුලි රැහැන් හා උපකරණ අනතුරු",
    cat_tree: "කඩා වැටුණු ගස් හා මාර්ග බාධා",
    cat_road_blocked: "අවහිර වූ මාර්ග හා බෝක්කු හානි",
    cat_landslide: "නායයෑම් අවදානම",
    cat_drainage: "කානු උතුරා යාම",
    cat_structural: "ගොඩනැගිලි හා තාප්ප හානි",
    cat_help: "හිරවූ පුද්ගලයින් / හදිසි ආධාර",

    urgency_critical: "අතිශය හදිසි",
    urgency_medium: "මධ්‍යම",
    urgency_low: "අවම",

    status_pending: "පරීක්ෂා කරමින්",
    status_published: "තහවුරු කළ වාර්තාව",
    status_need_info: "වැඩි විස්තර අවශ්‍යයි",
    status_area_alert: "ප්‍රදේශ අවවාදය",
    status_council_ticket: "සභා කාර්ය ඇණවුම",
    status_resolved: "විසඳන ලදී",

    report_title: "අනතුරක් වාර්තා කරන්න",
    report_subtitle: "AI තාක්ෂණය හරහා ක්ෂණිකව තහවුරු කර නගර සභාවට යොමු කෙරේ.",
    take_photo: "ඡායාරූපයක් ලබාගන්න හෝ උඩුගත කරන්න",
    retake_photo: "නැවත ඡායාරූපයක් ගන්න",
    change_photo: "ඡායාරූපය වෙනස් කරන්න",
    category_label: "අනතුරු වර්ගය",
    ward_label: "කොළඹ නාගරික කොට්ඨාශය",
    description_label: "විස්තරය (විකල්ප)",
    description_placeholder: "උදා: පාර දිගේ ජල මට්ටම ඉහළ යමින් පවතී, වාහන ගමනාගමනය ඇණහිට ඇත...",
    location_label: "සිදුවීම ඇති ස්ථානය (GPS)",
    detect_gps: "මගේ ස්ථානය ස්වයංක්‍රීයව හඳුනාගන්න",
    gps_detected: "ස්ථානය තහවුරු විය",
    submit_report: "වාර්තාව ඉදිරිපත් කරන්න",
    submitting: "පද්ධතියට ඇතුළත් කරමින්...",
    analyzing_pipeline: "AI පද්ධතිය හරහා තහවුරු කරමින්...",

    shelters_btn: "නවාතැන් මධ්‍යස්ථාන",
    safe_corridors_btn: "ආරක්ෂිත මාර්ග",
    free_beds: "ඇඳන් ඇත",
    confirm_hazard: "මා මෙහි සිටී (තහවුරු කරන්න)",
    confirmed: "ඔබ විසින් තහවුරු කරන ලදී",
    evacuation_route: "ආරක්ෂිත ඉවත් වීමේ මාර්ගය",
    legend: "සිතියම් සලකුණු",

    export_sitrep: "තත්ව වාර්තාව (SitRep)",
    emergency_broadcast: "හදිසි නිවේදනය",
    print_report: "මුද්‍රණය / PDF",
    download_csv: "CSV බාගත කරන්න",
    close: "වසන්න",
    call: "අමතන්න",
  },

  ta: {
    brand_name: "ஃபெண்டர் பேரிடர் உதவி",
    sub_brand: "NDRRMS · கொழும்பு மாநகர சபை",
    system_live: "அமைப்பு இயங்குகிறது · களனிப் படுக்கை",
    live_map: "நேரலை வரைபடம்",
    report_hazard: "ஆபத்தை புகாரளிக்கவும்",
    emergency_sos: "அவசரம் 117",
    language_selector: "மொழி",

    citizen: "குடிமக்கள் பிரிவு",
    council_officer: "மாநகர சபை அதிகாரி",
    field_crew: "கள மீட்புக் குழு",
    relief_desk: "நிவாரண ஒருங்கிணைப்பு",
    open_desk: "பிரிவைத் திறக்கவும்",
    exit_session: "வெளியேறு",

    cat_flood: "வெள்ளம் மற்றும் நீர் தேக்கம்",
    cat_electrical: "மின்சார கம்பி மற்றும் மின்கம்ப ஆபத்து",
    cat_tree: "விழுந்த மரங்கள் மற்றும் சாலைத் தடைகள்",
    cat_road_blocked: "அடைக்கப்பட்ட சாலை / வாய்க்கால் சேதம்",
    cat_landslide: "நிலச்சரிவு ஆபத்து",
    cat_drainage: "வடிகால் நிரம்பி வழிதல்",
    cat_structural: "கட்டிட சேதம் / இடிந்து விழும் அபாயம்",
    cat_help: "சிக்கிய மக்கள் / அவசர நிவாரணம்",

    urgency_critical: "அவசரமானது",
    urgency_medium: "நடுத்தரமானது",
    urgency_low: "குறைவானது",

    status_pending: "AI சரிபார்ப்பில்",
    status_published: "சரிபார்க்கப்பட்டு வெளியிடப்பட்டது",
    status_need_info: "கூடுதல் தகவல் தேவை",
    status_area_alert: "பிரதேச எச்சரிக்கை",
    status_council_ticket: "சபை நடவடிக்கை டிக்கெட்",
    status_resolved: "தீர்க்கப்பட்டது",

    report_title: "வெள்ள ஆபத்தை புகாரளிக்கவும்",
    report_subtitle: "AI தொழில்நுட்பம் மூலம் சரிபார்க்கப்பட்டு மீட்புக் குழுவிற்கு அனுப்பப்படும்.",
    take_photo: "புகைப்படம் எடுக்கவும் / பதிவேற்றவும்",
    retake_photo: "மீண்டும் புகைப்படம் எடுக்கவும்",
    change_photo: "புகைப்படத்தை மாற்றவும்",
    category_label: "ஆபத்து வகை",
    ward_label: "கொழும்பு மாநகர பிரிவு",
    description_label: "விளக்கம் (விருப்பமானது)",
    description_placeholder: "எ.கா: சாலையில் நீர்மட்டம் உயர்ந்துள்ளது, வாகனங்கள் செல்ல முடியவில்லை...",
    location_label: "சம்பவ இடம் (GPS)",
    detect_gps: "இருப்பிடத்தை தானாகக் கண்டறியவும்",
    gps_detected: "GPS இருப்பிடம் பெறப்பட்டது",
    submit_report: "அறிக்கையை சமர்ப்பிக்கவும்",
    submitting: "சமர்ப்பிக்கப்படுகிறது...",
    analyzing_pipeline: "AI சரிபார்ப்பு இயங்குகிறது...",

    shelters_btn: "நிவாரண முகாம்கள்",
    safe_corridors_btn: "பாதுகாப்பான பாதைகள்",
    free_beds: "படுக்கைகள் உள்ளன",
    confirm_hazard: "நான் இங்குள்ளேன் (உறுதிசெய்)",
    confirmed: "உங்களால் உறுதிப்படுத்தப்பட்டது",
    evacuation_route: "பாதுகாப்பான வெளியேற்றப் பாதை",
    legend: "வரைபட விளக்கங்கள்",

    export_sitrep: "நிலை அறிக்கை (SitRep)",
    emergency_broadcast: "அவசர ஒளிபரப்பு",
    print_report: "அச்சிடுக / PDF",
    download_csv: "CSV பதிவிறக்கம்",
    close: "மூடுக",
    call: "அழைக்க",
  },
};
