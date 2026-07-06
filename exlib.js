"use strict";
/* ============ exlib.js — exercise database & library ============
   Every exercise: muscle group (g), muscles trained (m), how-to (how). */

const EXDB = {
  /* ---- Chest ---- */
  "Bench Press":{g:"Chest",m:"Chest · Triceps · Front delts",how:"Lie flat with feet planted, grip a bit wider than shoulders. Lower the bar to mid-chest under control, then press to lockout keeping your shoulder blades squeezed."},
  "Incline Bench Press":{g:"Chest",m:"Upper chest · Front delts · Triceps",how:"Set the bench to 30–45°. Lower the bar to your upper chest and press up and slightly back, elbows about 45° from your torso."},
  "Decline Bench Press":{g:"Chest",m:"Lower chest · Triceps",how:"On a decline bench, lower the bar to your lower chest and press straight up, wrists stacked over elbows."},
  "Dumbbell Press":{g:"Chest",m:"Chest · Triceps · Front delts",how:"Press dumbbells from chest level to lockout, letting them travel slightly inward at the top. Control the descent into a deep, comfortable stretch."},
  "Incline Dumbbell Press":{g:"Chest",m:"Upper chest · Front delts",how:"On a 30–45° bench, press dumbbells up and together. Lower slowly until you feel a stretch across the upper chest."},
  "Chest Fly":{g:"Chest",m:"Chest",how:"With a slight, fixed elbow bend, open your arms wide until you feel a chest stretch, then bring hands together in a hugging arc — don't turn it into a press."},
  "Cable Crossover":{g:"Chest",m:"Chest",how:"Set pulleys high, step forward, and bring the handles down and together in front of you. Squeeze the chest where your hands meet."},
  "Push-ups":{g:"Chest",m:"Chest · Triceps · Core",how:"Hands under shoulders, body in one straight line. Lower your chest to just above the floor and push back up without letting the hips sag."},
  "Dips":{g:"Chest",m:"Lower chest · Triceps",how:"On parallel bars, lean slightly forward, lower until shoulders sit just below the elbows, then press up. Stay controlled at the bottom."},
  /* ---- Back ---- */
  "Deadlift":{g:"Back",m:"Whole back · Glutes · Hamstrings",how:"Bar over mid-foot, grip just outside the knees, chest up. Push the floor away and stand tall, keeping the bar close and your back flat throughout."},
  "Pull-ups":{g:"Back",m:"Lats · Biceps · Upper back",how:"Hang with an overhand grip. Pull your chest toward the bar by driving the elbows down, then lower with control to a full hang."},
  "Chin-ups":{g:"Back",m:"Lats · Biceps",how:"Underhand grip at shoulder width. Pull until your chin clears the bar — this angle hits biceps and lower lats hard."},
  "Lat Pulldown":{g:"Back",m:"Lats · Biceps",how:"Grip wide, lean back slightly, and pull the bar to your upper chest driving the elbows down. Resist the weight all the way up."},
  "Barbell Row":{g:"Back",m:"Mid-back · Lats · Rear delts",how:"Hinge to about 45° with a flat back. Row the bar to your lower ribs, squeeze the shoulder blades, lower under control."},
  "Dumbbell Row":{g:"Back",m:"Lats · Mid-back",how:"One knee and hand on a bench, back flat. Row the dumbbell to your hip, keeping the elbow close to your body."},
  "Seated Cable Row":{g:"Back",m:"Mid-back · Lats · Biceps",how:"Sit tall and pull the handle to your stomach, squeezing the shoulder blades together, then let the arms extend fully."},
  "T-Bar Row":{g:"Back",m:"Mid-back · Lats",how:"Straddle the bar, hinge forward with a flat back, and row the handles to your chest with strict form."},
  "Face Pull":{g:"Back",m:"Rear delts · Upper back",how:"Rope set at face height. Pull toward your face with elbows high, rotating the hands back as if flexing your arms."},
  "Back Extension":{g:"Back",m:"Lower back · Glutes · Hamstrings",how:"Hinge at the hips over the pad, lower your torso, then raise until your body forms a straight line. Don't overarch at the top."},
  /* ---- Shoulders ---- */
  "Overhead Press":{g:"Shoulders",m:"Shoulders · Triceps",how:"Stand tall with the bar at your collarbone. Press straight up to lockout, squeezing your glutes to protect the lower back."},
  "Dumbbell Shoulder Press":{g:"Shoulders",m:"Shoulders · Triceps",how:"Press dumbbells from shoulder height to overhead, ribs down and core braced the whole way."},
  "Arnold Press":{g:"Shoulders",m:"All three delt heads",how:"Start with palms facing you at chest height; rotate them outward as you press overhead, and reverse on the way down."},
  "Lateral Raise":{g:"Shoulders",m:"Side delts",how:"With a slight elbow bend, raise the dumbbells out to shoulder height leading with the elbows. Lower slowly — no swinging."},
  "Front Raise":{g:"Shoulders",m:"Front delts",how:"Raise the weight straight in front of you to shoulder height at a controlled tempo, one arm or both."},
  "Rear Delt Fly":{g:"Shoulders",m:"Rear delts · Upper back",how:"Hinge forward with arms hanging. Open your arms wide to the sides and squeeze the back of the shoulders at the top."},
  "Upright Row":{g:"Shoulders",m:"Side delts · Traps",how:"Pull the bar up along your body to chest height, elbows leading. A slightly wider grip is friendlier to the wrists."},
  "Shrugs":{g:"Shoulders",m:"Traps",how:"Holding heavy dumbbells, shrug your shoulders straight up toward your ears, pause, then lower fully."},
  /* ---- Arms ---- */
  "Barbell Curl":{g:"Arms",m:"Biceps",how:"Elbows pinned to your sides, curl the bar up without swinging, then lower over two to three seconds."},
  "Dumbbell Curl":{g:"Arms",m:"Biceps",how:"Curl with palms up, keeping the elbows still. Full stretch at the bottom, hard squeeze at the top."},
  "Hammer Curl":{g:"Arms",m:"Biceps · Forearms",how:"Curl with a neutral thumbs-up grip to hit the brachialis and forearms. Strict, controlled reps."},
  "Preacher Curl":{g:"Arms",m:"Biceps",how:"Arms on the preacher pad, curl up and lower deep — the pad kills momentum and keeps the tension honest."},
  "Cable Curl":{g:"Arms",m:"Biceps",how:"Curl the cable with constant tension and don't let the stack touch down between reps."},
  "Tricep Pushdown":{g:"Arms",m:"Triceps",how:"Elbows locked at your sides, push the cable down to full lockout and squeeze, then let it rise to a right angle."},
  "Skull Crushers":{g:"Arms",m:"Triceps",how:"Lying down, lower the bar toward your forehead bending only at the elbows, then extend back to the start."},
  "Overhead Tricep Extension":{g:"Arms",m:"Triceps (long head)",how:"Weight overhead, lower it behind your head for a deep stretch, then extend the elbows to press back up."},
  "Close-Grip Bench Press":{g:"Arms",m:"Triceps · Chest",how:"Bench press with hands at shoulder width and elbows tucked. Touch the lower chest, press to lockout."},
  /* ---- Legs ---- */
  "Squat":{g:"Legs",m:"Quads · Glutes · Core",how:"Bar on your upper back, feet shoulder-width. Sit down between your hips to parallel or below, then drive up through mid-foot."},
  "Front Squat":{g:"Legs",m:"Quads · Core",how:"Bar racked on the front delts with elbows high. Squat deep while keeping the torso as upright as possible."},
  "Leg Press":{g:"Legs",m:"Quads · Glutes",how:"Feet shoulder-width on the platform. Lower under control until the knees near 90°, then press without slamming into lockout."},
  "Lunges":{g:"Legs",m:"Quads · Glutes",how:"Step forward and drop the back knee toward the floor, front shin vertical. Push back up through the front heel."},
  "Bulgarian Split Squat":{g:"Legs",m:"Quads · Glutes",how:"Rear foot on a bench, front foot well forward. Lower straight down until the rear knee nears the floor, then drive up."},
  "Romanian Deadlift":{g:"Legs",m:"Hamstrings · Glutes",how:"Slight knee bend, push your hips back and slide the bar down your legs until the hamstrings stretch, then stand tall."},
  "Leg Extension":{g:"Legs",m:"Quads",how:"Extend the knees to lift the pad, pause for a squeeze at the top, and lower slowly."},
  "Leg Curl":{g:"Legs",m:"Hamstrings",how:"Curl the pad toward your glutes and control the return — no bouncing out of the bottom."},
  "Hip Thrust":{g:"Legs",m:"Glutes",how:"Upper back on a bench, bar over your hips. Drive the hips up until your body is level and squeeze the glutes hard."},
  "Calf Raise":{g:"Legs",m:"Calves",how:"Rise as high as possible onto your toes, pause, then lower into a deep stretch. Slow beats bouncy."},
  "Goblet Squat":{g:"Legs",m:"Quads · Glutes · Core",how:"Hold a dumbbell at your chest and squat deep between your knees, chest tall the whole time."},
  /* ---- Core ---- */
  "Plank":{g:"Core",m:"Core · Shoulders",how:"Forearms down, body in one straight line head to heels. Brace the abs and keep breathing — don't let the hips drop."},
  "Crunches":{g:"Core",m:"Abs",how:"Curl your shoulder blades off the floor by contracting the abs, exhale at the top, lower slowly."},
  "Sit-ups":{g:"Core",m:"Abs · Hip flexors",how:"From lying, curl your torso all the way up toward the knees, then roll back down one vertebra at a time."},
  "Leg Raise":{g:"Core",m:"Lower abs · Hip flexors",how:"Hanging or lying, raise straight legs until the hips curl slightly, then lower without arching the lower back."},
  "Russian Twist":{g:"Core",m:"Obliques",how:"Seated and leaned back slightly, rotate your torso side to side, moving the weight across your body."},
  "Cable Crunch":{g:"Core",m:"Abs",how:"Kneel below a high cable and crunch your elbows toward your knees by flexing the spine — don't pull with the arms."},
  "Ab Wheel":{g:"Core",m:"Core · Lats",how:"Roll the wheel forward only as far as you can keep your back flat, then pull back in with the abs."},
  "Mountain Climbers":{g:"Core",m:"Core · Cardio",how:"From a push-up position, drive the knees toward your chest in fast alternating strides, hips staying level."},
  /* ---- Cardio ---- */
  "Treadmill":{g:"Cardio",m:"Heart & lungs · Legs",how:"Walk or run at a pace you can sustain; use incline to raise intensity without extra impact."},
  "Running":{g:"Cardio",m:"Heart & lungs · Legs",how:"Tall posture, relaxed shoulders, feet landing under your hips with quick light steps."},
  "Cycling":{g:"Cardio",m:"Heart & lungs · Quads",how:"Set the saddle so the knee stays slightly bent at the bottom of the stroke, and hold a steady cadence."},
  "Rowing Machine":{g:"Cardio",m:"Heart & lungs · Back · Legs",how:"Drive with the legs first, then lean back and pull the handle to the ribs; reverse the order on the way back."},
  "Stair Climber":{g:"Cardio",m:"Heart & lungs · Glutes",how:"Step fully onto each stair and stay off the rails so your legs do the work."},
  "Elliptical":{g:"Cardio",m:"Heart & lungs · Full body",how:"Low-impact full-body work — push and pull the handles while keeping an upright posture."},
  "Jump Rope":{g:"Cardio",m:"Heart & lungs · Calves",how:"Small quick hops on the balls of the feet; the wrists spin the rope, elbows stay close."},
  "Swimming":{g:"Cardio",m:"Heart & lungs · Full body",how:"Long relaxed strokes with a steady exhale into the water — technique quality beats speed."}
};

const MUSCLES = ["Chest","Back","Shoulders","Arms","Legs","Core","Cardio"];
const EXLIB = {};
MUSCLES.forEach(g => { EXLIB[g] = Object.keys(EXDB).filter(n => EXDB[n].g === g); });

/* ---- inline SVG icons (no emojis) ---- */
const GYM_SVG = {
  barbell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3.5 12h17M7 8.2v7.6M17 8.2v7.6M4.5 9.6v4.8M19.5 9.6v4.8"/></svg>',
  dumbbell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M8.5 12h7M6.2 8.6v6.8M17.8 8.6v6.8M4 10.2v3.6M20 10.2v3.6"/></svg>',
  body:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4.8" r="2.1"/><path d="M12 7.6v5.6M12 9.6l-3.8 1.9M12 9.6l3.8 1.9M12 13.2l-2.9 5.4M12 13.2l2.9 5.4"/></svg>',
  core:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="8" y="4.5" width="8" height="15" rx="3.4"/><path d="M12 4.5v15M8 9.5h8M8 14.5h8"/></svg>',
  cardio:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19.5S5.6 15.4 3.9 11.4C2.8 8.9 4.4 6 7.1 6c1.7 0 2.8.9 4 2.4C12.3 6.9 13.4 6 15.1 6c2.7 0 4.3 2.9 3.2 5.4-1.7 4-6.3 8.1-6.3 8.1z"/><path d="M6.5 12h3l1.2-2.4 2 4.2 1.3-1.8h3.5"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 4l2.3 4.9 5.2.7-3.8 3.7.9 5.3L12 16l-4.6 2.6.9-5.3L4.5 9.6l5.2-.7L12 4z"/></svg>'
};
const GROUP_ICON = { Chest:"barbell", Back:"barbell", Shoulders:"dumbbell", Arms:"dumbbell", Legs:"barbell", Core:"core", Cardio:"cardio", Custom:"star" };
function gymIcon(group){ return GYM_SVG[GROUP_ICON[group] || "body"]; }

function exMuscle(name){
  const info = EXDB[name] || EXDB[Object.keys(EXDB).find(k => k.toLowerCase() === String(name).toLowerCase())];
  return info ? info.g : "Custom";
}
function exInfo(name){
  return EXDB[name] || EXDB[Object.keys(EXDB).find(k => k.toLowerCase() === String(name).toLowerCase())] || null;
}
function exLibAll(){
  const out = [];
  MUSCLES.forEach(g => EXLIB[g].forEach(n => out.push({ n, g })));
  (S.customEx||[]).forEach(n => out.push({ n, g:"Custom" }));
  return out;
}

/* ---- library list (browse + pick modes) ---- */
let exQuery = "";
function openExLib(pick){
  window._exPick = !!pick;
  exQuery = "";
  openDetail("exlib", "all");
}
function exLibSearch(v){ exQuery = v; $("#exlib-list").innerHTML = exLibListHTML(); }
function exLibListHTML(){
  const q = exQuery.trim().toLowerCase();
  const all = exLibAll().filter(e => !q || e.n.toLowerCase().includes(q) || (exInfo(e.n) && exInfo(e.n).m.toLowerCase().includes(q)));
  if(!all.length) return `<div class="empty"><span class="e">?</span>Nothing matches — add it as a custom exercise above.</div>`;
  const groups = {};
  all.forEach(e => { (groups[e.g] = groups[e.g] || []).push(e.n); });
  let html = "";
  Object.keys(groups).forEach(g => {
    html += `<div class="date-head">${g}</div>`;
    html += groups[g].map(n => {
      const done = exSessions(n).length;
      const info = exInfo(n);
      return `<div class="item" onclick="pickLibEx('${escq(n)}')">
        <div class="ico gico">${gymIcon(g)}</div>
        <div class="bd"><div class="t">${esc(n)}</div><div class="s">${info ? esc(info.m) : "Custom exercise"}${done ? " · " + done + " session" + (done>1?"s":"") : ""}</div></div>
        ${window._exPick ? '<span class="pri" style="font-size:1.2rem;font-weight:700">+</span>' : '<span class="sub">›</span>'}</div>`;
    }).join("");
  });
  return html;
}
function pickLibEx(name){
  if(window._exPick){
    addExToSession(name);
    history.back();
  } else {
    openExPage(name);
  }
}
function pageExLib(){
  return pageHead(window._exPick ? "Add exercise" : "Exercise library") +
    `<input class="inp" placeholder="Search exercises or muscles…" value="${escq(exQuery)}" oninput="exLibSearch(this.value)">
     <button class="btn btn-g mini" style="margin-bottom:8px" onclick="openCustomEx()">+ Custom exercise</button>
     <div id="exlib-list">${exLibListHTML()}</div>`;
}
function openCustomEx(){
  openModal(`<h3>Custom exercise</h3>
    <label class="f">Name</label>
    <input class="inp" id="cx-n" placeholder="e.g. Landmine Press">
    <button class="btn btn-p" onclick="saveCustomEx()">Add</button>`);
  focusIn("#cx-n");
}
function saveCustomEx(){
  const n = $("#cx-n").value.trim();
  if(!n){ toast("Give it a name"); return; }
  if(exLibAll().some(e => e.n.toLowerCase() === n.toLowerCase())){ toast("Already in the library"); return; }
  S.customEx.push(n);
  save(); closeModal();
  if(window._exPick){ addExToSession(n); history.back(); }
  else route();
  toast("Added to library ✓");
}
