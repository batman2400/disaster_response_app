param(
    [string]$Mode = "3min",
    [string]$Text = "",
    [int]$Rate = 0,
    [int]$Volume = 100
)

Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = $Rate
$synth.Volume = $Volume

$pitch60s = @"
Good morning, judges. During seasonal monsoons in Colombo, when the Kelani River breaches its banks, traditional disaster response collapses. Emergency call centers are overwhelmed by thousands of duplicate calls, dispatchers spend 45 minutes manually verifying whether a road is blocked, and displaced families cannot locate loved ones across scattered shelters.

We built FENDER: an intelligent, multi-tier disaster response ecosystem that bridges the gap between affected citizens, municipal command headquarters, field rescue units, and humanitarian relief coordinators.

Powered by a 5-check multimodal AI pipeline with Google Gemini and PostGIS spatial clustering, Fender validates citizen hazard reports in under 3 seconds, cuts duplicate ticket spam by 90%, automatically escalates flood alerts when river gauges breach thresholds, and enforces mandatory photographic proof before field crews can mark road hazards cleared.

With Fender, we replace chaos with clarity, turning hours of panic into seconds of coordinated, life-saving action.
"@

$pitch3min = @"
Judges, every monsoon season, Colombo's Kelani River breaches its banks in Nagalagam Street, Sedawatta, and Kolonnawa. Thousands of families are marooned. But the real tragedy isn't just the water. It's the information void. Municipal dispatchers are inundated with thousands of chaotic phone calls, taking up to 45 minutes to verify a single incident while critical ambulances navigate into submerged dead ends.

Traditional response breaks down on four critical fronts. First, dispatchers waste hours sifting fake news from real drownings. Second, fifty people call about the same fallen tree, paralyzing the lines. Third, field units verbally radio that a road is clear without proof. And fourth, displaced families cannot find their elderly parents or children across twenty disconnected shelters.

We created FENDER: a closed-loop crisis ecosystem. When a citizen snaps a photo on our trilingual progressive web app, our 5-Check AI Pipeline takes over in under 3 seconds. Check 1 performs vernacular translation across Sinhala, Tamil, and English. Check 2 uses Gemini 3.5 Flash Lite Computer Vision to estimate water depth and detect fallen live wires. Check 3 validates against live Kelani River and rainfall telemetry for hydrological feasibility. Check 4 uses PostGIS spatial clustering to group reports within 150 meters, collapsing duplicate spam by 90 percent. And Check 5 evaluates ward topology and risk. If confidence is above 0.75, it auto-publishes to the city map instantly.

Fender connects all four crisis stakeholders in real time. Municipal officers get an interactive command console with live incident queues and autonomous river gauge alerts. Field crews from the Sri Lanka Navy and CMC receive dispatch tickets with GPS navigation, and must submit a mandatory live after-fix photo before the system unblocks the public road, eliminating ghost clearances. Relief centers access live bed telemetry and our I'm Safe Registry, allowing families worldwide to search for missing loved ones in seconds.

Fender is not a prototype mockup. It is live right now on Vercel, powered by Next.js 16, Supabase PostGIS, Google Gemini, and Expo React Native. We deliver a 90 percent reduction in triage delay, zero ghost clearances, and 100 percent trilingual inclusivity.

Flash floods are inevitable. Blind disaster response is not. Fender gives our city the intelligence to save lives before the waters rise. Thank you.
"@

$speechText = ""

if ($Text -ne "") {
    $speechText = $Text
} elseif ($Mode -eq "60s") {
    $speechText = $pitch60s
} else {
    $speechText = $pitch3min
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  FENDER Text-to-Speech Engine Activated  " -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Mode: $Mode" -ForegroundColor Green
Write-Host "Rate: $Rate | Volume: $Volume" -ForegroundColor Gray
Write-Host ""
Write-Host "Speaking:" -ForegroundColor White
Write-Host $speechText -ForegroundColor Gray
Write-Host ""

$synth.Speak($speechText)

Write-Host "Speech completed." -ForegroundColor Green
