const KEY = "aiLearningPortalState_v3";
const DEFAULT_STATE = {
  xp: 0,
  modules: { 1: false, 2: false, 3: false },
  moduleChecks: { 1: false, 2: false, 3: false },
  moduleActivities: { 1: [false, false, false], 2: [false, false, false], 3: [false, false, false] },
  challenges: { quiz: false, prompt: false, ethics: false },
  settings: { high: false, large: false, reduceMotion: false }
};

let state = loadState();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    const merged = {
      ...structuredClone(DEFAULT_STATE),
      ...(saved || {}),
      modules: { ...DEFAULT_STATE.modules, ...(saved?.modules || {}) },
      moduleChecks: { ...DEFAULT_STATE.moduleChecks, ...(saved?.moduleChecks || {}) },
      challenges: { ...DEFAULT_STATE.challenges, ...(saved?.challenges || {}) },
      settings: { ...DEFAULT_STATE.settings, ...(saved?.settings || {}) },
      moduleActivities: { ...DEFAULT_STATE.moduleActivities, ...(saved?.moduleActivities || {}) }
    };
    for (const n of [1, 2, 3]) {
      const activities = merged.moduleActivities[n];
      merged.moduleActivities[n] = Array.isArray(activities) && activities.length === 3
        ? activities.map(Boolean) : [false, false, false];
    }
    return merged;
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function awardXP(amount, key) {
  if (key && state.challenges[key]) return;
  if (key) state.challenges[key] = true;
  state.xp = Math.min(500, state.xp + amount);
  saveState();
  updateUI();
  showToast(`+${amount} XP earned`);
}

function activitiesComplete(moduleNumber) {
  return (state.moduleActivities[moduleNumber] || []).length === 3 && state.moduleActivities[moduleNumber].every(Boolean);
}

function completeModule(moduleNumber) {
  if (state.modules[moduleNumber]) return;
  if (!activitiesComplete(moduleNumber)) {
    showToast("Complete all three applied checkpoints first.");
    document.querySelector(`[data-module-lab="${moduleNumber}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  if (!state.moduleChecks[moduleNumber]) {
    showToast("Pass the module knowledge check before completing this module.");
    document.querySelector(`[data-module-assessment="${moduleNumber}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  state.modules[moduleNumber] = true;
  state.xp = Math.min(500, state.xp + 100);
  saveState();
  updateUI();
  showToast(`Module ${String(moduleNumber).padStart(2, "0")} complete · +100 XP`);
}

function getLevel(xp) {
  if (xp >= 400) return ["05", "AI Master"];
  if (xp >= 300) return ["04", "Level 300–399"];
  if (xp >= 200) return ["03", "Level 200–299"];
  if (xp >= 100) return ["02", "Level 100–199"];
  return ["01", "AI Beginner"];
}

function updateUI() {
  const xp = state.xp;
  const percent = Math.round((xp / 500) * 100);
  const completedModules = Object.values(state.modules).filter(Boolean).length;
  const [levelNumber, levelName] = getLevel(xp);

  setText("homeXP", xp);
  setText("progressText", `${xp} / 500 XP`);
  const homeProgress = document.getElementById("homeProgress");
  if (homeProgress) homeProgress.style.setProperty("--progress", `${percent}%`);

  setText("dashXP", xp);
  setText("dashPercent", `${percent}%`);
  setText("dashLevel", levelNumber);
  setText("dashLevelName", levelName);

  for (let i = 1; i <= 3; i++) {
    const activityCount = (state.moduleActivities[i] || []).filter(Boolean).length;
    const started = activityCount > 0 || state.moduleChecks[i];
    setText(`m${i}status`, state.modules[i] ? "Completed" : started ? `In progress · ${activityCount}/3 labs` : "Not started");
    const bar = document.getElementById(`m${i}bar`);
    if (bar) bar.style.width = `${state.modules[i] ? 100 : Math.round((activityCount / 4 + (state.moduleChecks[i] ? .25 : 0)) * 100)}%`;
  }

  setText("quizStatus", state.challenges.quiz ? "Completed" : "Not completed");
  setText("promptStatus", state.challenges.prompt ? "Completed" : "Not completed");
  setText("ethicsStatus", state.challenges.ethics ? "Completed" : "Not completed");

  const next = completedModules < 3
    ? `Continue Module 0${completedModules + 1}`
    : "Complete remaining challenges";
  setText("nextAction", next);

  document.querySelectorAll("[data-module-complete]").forEach(button => {
    const module = Number(button.dataset.moduleComplete);
    const done = state.modules[module];
    const passed = state.moduleChecks[module];
    const labsDone = activitiesComplete(module);
    button.textContent = done ? "Module Completed ✓" : !labsDone ? `Complete Applied Checkpoints (${(state.moduleActivities[module] || []).filter(Boolean).length}/3)` : !passed ? "Pass Knowledge Check to Unlock" : "Complete Module +100 XP";
    button.disabled = done || !labsDone || !passed;
  });

  renderBadges();
  renderMilestoneTracker();
  applyAccessibilityState();
  const metrics = {
    modules: Math.round((completedModules / 3) * 100),
    quiz: state.challenges.quiz ? 100 : 0,
    challenges: Math.round(((Number(state.challenges.prompt) + Number(state.challenges.ethics)) / 2) * 100)
  };
  Object.entries(metrics).forEach(([key, value]) => {
    document.querySelectorAll(`[data-analytics="${key}"]`).forEach(bar => bar.style.width = `${value}%`);
  });
}

function renderMilestoneTracker() {
  const mount = document.getElementById("milestoneTracker");
  if (!mount) return;
  const moduleNames = { 1: "AI Fundamentals", 2: "Using AI Tools", 3: "AI Ethics & Responsibility" };
  const moduleCards = [1, 2, 3].map(number => {
    const activities = state.moduleActivities[number] || [false, false, false];
    const checksDone = activities.filter(Boolean).length;
    const passed = !!state.moduleChecks[number];
    const complete = !!state.modules[number];
    const pct = complete ? 100 : Math.round((checksDone / 4 + (passed ? .25 : 0)) * 100);
    return `<article class="milestone-card"><div class="milestone-card-head"><span>MODULE 0${number}</span><b class="milestone-status ${complete ? "is-done" : ""}">${complete ? "COMPLETE" : `${checksDone}/3 LABS`}</b></div><h3>${moduleNames[number]}</h3><div class="milestone-progress"><i style="width:${pct}%"></i></div><ul class="milestone-task-list">${activities.map((done, i) => `<li class="${done ? "task-done" : ""}"><span>${done ? "✓" : "○"}</span>Applied checkpoint ${i + 1}</li>`).join("")}<li class="${passed ? "task-done" : ""}"><span>${passed ? "✓" : "○"}</span>Scored knowledge check</li><li class="${complete ? "task-done" : ""}"><span>${complete ? "✓" : "○"}</span>Module reward (+100 XP)</li></ul><a class="button secondary full" href="learn.html#module-${number}">${complete ? "Review Module" : checksDone ? "Continue Module" : "Start Module"} →</a></article>`;
  });
  const challengeData = [
    ["Fundamentals Quiz", state.challenges.quiz, "challenges.html#quiz", "Score at least 4 out of 5"],
    ["Prompt Challenge", state.challenges.prompt, "challenges.html#prompt-challenge", "Choose the strongest prompt"],
    ["Ethics Challenge", state.challenges.ethics, "challenges.html#ethics-challenge", "Choose the responsible action"]
  ];
  const challengeCards = `<article class="milestone-card milestone-challenges"><div class="milestone-card-head"><span>CHALLENGE TRACK</span><b>${challengeData.filter(item => item[1]).length}/3 COMPLETE</b></div><h3>Independent challenges</h3><p class="milestone-intro">These rewards are separate from module completion and can be earned once each.</p><ul class="milestone-task-list">${challengeData.map(([name, done, href, detail]) => `<li class="${done ? "task-done" : ""}"><span>${done ? "✓" : "○"}</span><div><strong>${name}</strong><small>${detail}</small><a href="${href}">${done ? "Review challenge" : "Open challenge"} →</a></div></li>`).join("")}</ul></article>`;
  mount.innerHTML = moduleCards.join("") + challengeCards;
}

function renderBadges() {
  const grid = document.getElementById("badgeGrid");
  if (!grid) return;
  const moduleCount = Object.values(state.modules).filter(Boolean).length;
  const badges = [
    ["AI Beginner", state.modules[1]],
    ["AI Explorer", moduleCount >= 2],
    ["AI Apprentice", moduleCount === 3],
    ["Prompt Engineer", state.challenges.prompt],
    ["Ethical AI User", state.challenges.ethics],
    ["AI Master", state.xp >= 400]
  ];
  grid.innerHTML = badges.map(([name, unlocked]) => `
    <div class="badge-item ${unlocked ? "unlocked" : "locked"}">
      <strong>${unlocked ? "✓" : "○"}</strong>
      <div>${name}</div>
    </div>
  `).join("");
}

const moduleLabData = {
  1: {
    title: "Fundamentals Field Lab",
    intro: "Complete these three short applications to unlock the scored module knowledge check.",
    activities: [
      { title: "Recognize machine learning", prompt: "A music service studies past listening patterns to rank songs a listener may like. What is the best description?", options: ["A fixed playlist that never changes", "A model using patterns in data to make a recommendation", "A guarantee that the listener will like every song"], correct: 1, why: "The service estimates preferences from patterns. The result is a prediction, not a guarantee." },
      { title: "Test generalization", prompt: "A model scores 99% on training examples but performs poorly on new examples. What should the team investigate?", options: ["Whether the model overfit or learned shortcuts", "How to hide the test results", "Whether testing can be skipped"], correct: 0, why: "A large gap between training and test performance can indicate weak generalization or overfitting." },
      { title: "Evaluate a claim", prompt: "An AI answer gives a confident statistic with no source. What is the best next step?", options: ["Trust it because it sounds precise", "Ask the same tool to repeat it and assume agreement proves it", "Find and check a reliable original source"], correct: 2, why: "Fluent, specific language does not establish truth. Check important claims against reliable evidence." }
    ]
  },
  2: {
    title: "AI Tool Practice Lab",
    intro: "Apply prompt design, output review, and responsible tool use before unlocking the scored knowledge check.",
    activities: [
      { title: "Strengthen the prompt", prompt: "You need a comparison for a school science report. Which instruction is most actionable?", options: ["Tell me about energy", "Compare solar and wind energy for a grade 9 audience in a table with cost, benefits, limitations, and one source to verify", "Write something interesting"], correct: 1, why: "The stronger prompt specifies the task, audience, format, dimensions, and verification need." },
      { title: "Verify the result", prompt: "A generated answer includes a quotation and a research-paper title. What should happen before you cite it?", options: ["Check the paper and confirm the quotation in the original source", "Use it if the formatting looks academic", "Cite the AI tool as proof the paper exists"], correct: 0, why: "A source title or citation can be fabricated or inaccurate. Locate the original source and confirm it." },
      { title: "Use coding help well", prompt: "An AI suggests a code fix you do not understand. What is the best workflow?", options: ["Paste it directly into production", "Ask for an explanation, test it safely, and inspect the changes", "Assume generated code is secure"], correct: 1, why: "Understand the change, test it in a safe environment, and review for correctness and security." }
    ]
  },
  3: {
    title: "Responsible-Use Decision Lab",
    intro: "Work through three distinct risk decisions. All three are required before the scored knowledge check unlocks.",
    activities: [
      { title: "Academic honesty", prompt: "An assignment permits AI for brainstorming but requires original writing. Which action follows the rules?", options: ["Submit generated text as your own", "Use AI for allowed brainstorming, then write and disclose assistance as required", "Assume every use is allowed because it is educational"], correct: 1, why: "Use must stay within the assignment's stated rules, and disclosure should follow the relevant policy." },
      { title: "Protect private information", prompt: "A prompt would be easier if you pasted a classmate's private support record. What should you do?", options: ["Upload it if you remove only the name", "Use it because the tool is convenient", "Do not share it unless the use and tool are explicitly authorized; use a fictional example instead"], correct: 2, why: "Removing one identifier may not anonymize a record. Avoid exposing sensitive information without authorization." },
      { title: "Check possible misinformation", prompt: "A realistic video makes a shocking claim, but the source is unknown. What should you do before sharing?", options: ["Check original context and reliable independent reporting", "Share it because it looks real", "Use the number of views as proof"], correct: 0, why: "Realistic media can be manipulated. Verify context and corroboration before sharing it." }
    ]
  }
};

function renderModuleLabs() {
  document.querySelectorAll("[data-module-lab]").forEach(mount => {
    const moduleNumber = Number(mount.dataset.moduleLab);
    const lab = moduleLabData[moduleNumber];
    if (!lab) return;
    const completed = state.moduleActivities[moduleNumber] || [false, false, false];
    const doneCount = completed.filter(Boolean).length;
    mount.innerHTML = `<section class="module-lab" aria-labelledby="moduleLabTitle${moduleNumber}">
      <div class="module-lab-header"><div><p class="eyebrow">APPLIED PRACTICE / REQUIRED TO CONTINUE</p><h3 id="moduleLabTitle${moduleNumber}">${lab.title}</h3><p>${lab.intro}</p></div><div class="module-lab-progress"><strong>${doneCount} / 3</strong><small>checkpoints complete</small><div class="module-lab-track"><i style="width:${doneCount / 3 * 100}%"></i></div></div></div>
      <div class="module-activity-grid">${lab.activities.map((activity, index) => {
        const isDone = !!completed[index];
        return `<article class="module-activity ${isDone ? "is-complete" : ""}" data-activity-card="${moduleNumber}-${index}"><div class="module-activity-top"><span>CHECKPOINT 0${index + 1}</span><b>${isDone ? "PASSED ✓" : "REQUIRED"}</b></div><h4>${activity.title}</h4><p>${activity.prompt}</p><div class="module-activity-options">${activity.options.map((option, optionIndex) => `<button type="button" data-lab-module="${moduleNumber}" data-lab-activity="${index}" data-lab-answer="${optionIndex}" ${isDone ? "disabled" : ""} class="${isDone && optionIndex === activity.correct ? "correct" : ""}">${option}</button>`).join("")}</div><p class="module-activity-feedback ${isDone ? "success-message" : ""}" aria-live="polite">${isDone ? activity.why : "Choose the best response. You can retry if you miss it."}</p></article>`;
      }).join("")}</div><p class="module-gate-note">${doneCount === 3 ? "All applied checkpoints passed. The scored knowledge check is now available." : `Complete ${3 - doneCount} more checkpoint${3 - doneCount === 1 ? "" : "s"} to unlock the scored knowledge check.`}</p>
    </section>`;
  });
  document.querySelectorAll("[data-lab-answer]").forEach(button => button.addEventListener("click", () => {
    const moduleNumber = Number(button.dataset.labModule);
    const activityIndex = Number(button.dataset.labActivity);
    const answerIndex = Number(button.dataset.labAnswer);
    const activity = moduleLabData[moduleNumber].activities[activityIndex];
    const card = button.closest(".module-activity");
    const feedback = card.querySelector(".module-activity-feedback");
    const buttons = [...card.querySelectorAll("[data-lab-answer]")];
    if (answerIndex === activity.correct) {
      state.moduleActivities[moduleNumber][activityIndex] = true;
      saveState();
      renderModuleLabs();
      updateUI();
      renderModuleAssessments();
      showToast(`Checkpoint ${activityIndex + 1} passed`);
    } else {
      buttons.forEach(item => { item.disabled = false; item.classList.remove("wrong"); });
      button.classList.add("wrong");
      feedback.textContent = "Not quite. Review the lesson and try another answer.";
      feedback.classList.remove("success-message");
      feedback.classList.add("error-message");
    }
  }));
}

const moduleAssessmentData = {
  1: {
    title: "Module 01 Knowledge Check",
    intro: "Answer all three questions. You need at least 2 correct answers to unlock module completion.",
    questions: [
      { q: "Which statement best describes machine learning?", a: ["A computer component that stores files", "A method that learns patterns from examples or data", "A fixed list of manually written answers", "A type of internet connection"], correct: 1, why: "Machine learning uses data to learn patterns that can support predictions or other outputs." },
      { q: "Why should a model be tested on examples it did not train on?", a: ["To check whether it can generalize beyond memorized examples", "To guarantee that it will never make a mistake", "To make the dataset smaller in every case", "To remove the need for human review"], correct: 0, why: "Testing on unseen examples helps estimate how the model may perform in new situations." },
      { q: "What is the safest interpretation of a fluent AI answer?", a: ["It is true because it sounds confident", "It has been checked by a human automatically", "It is an output that may still need verification", "It is always copied from a reliable source"], correct: 2, why: "Fluent wording does not guarantee accuracy; important claims should be verified." }
    ]
  },
  2: {
    title: "Module 02 Knowledge Check",
    intro: "Apply the prompting and verification workflow. You need at least 2 correct answers to unlock completion.",
    questions: [
      { q: "Which prompt gives the tool the most useful direction?", a: ["Tell me something", "Write better", "Explain renewable energy to a grade 9 student in 4 bullet points and include one limitation", "Do the thing quickly"], correct: 2, why: "It identifies the task, audience, format, and a specific content requirement." },
      { q: "An AI research answer includes a statistic and a source title. What should you do?", a: ["Cite it immediately", "Verify the statistic and source independently before using it", "Assume the title proves the statistic", "Ask the same AI and trust whichever answer is longer"], correct: 1, why: "AI can invent or misstate sources; independently check claims and citations." },
      { q: "What is a strong workflow for using AI tools?", a: ["Generate, publish, and never review", "Plan the task, generate a draft, verify it, then revise", "Give no context and accept the first answer", "Use AI instead of understanding the task"], correct: 1, why: "Planning, review, and revision help keep the output relevant and reliable." }
    ]
  },
  3: {
    title: "Module 03 Knowledge Check",
    intro: "Choose responsible actions in realistic situations. You need at least 2 correct answers to unlock completion.",
    questions: [
      { q: "Your teacher permits AI brainstorming but requires your own final writing. What should you do?", a: ["Submit an AI-written response as your own", "Use AI for allowed brainstorming, then write the final response yourself", "Hide all AI use even if disclosure is required", "Ignore the teacher's directions"], correct: 1, why: "Follow the assignment's rules and keep the work that must be yours genuinely your own." },
      { q: "What should you do before uploading private student records to an AI tool?", a: ["Upload them if the prompt is clear", "Remove only the names and assume no risk remains", "Do not share them unless the tool and use are explicitly authorized", "Ask the tool to keep the information secret"], correct: 2, why: "Sensitive information needs proper authorization and privacy safeguards; do not assume a tool is approved." },
      { q: "A realistic video makes a surprising claim, but its source is unclear. What is the responsible response?", a: ["Share it before it gets deleted", "Treat realism as proof", "Check reliable independent sources and original context before sharing", "Use the video as the only source"], correct: 2, why: "Synthetic or manipulated media can look authentic, so verify context before spreading it." }
    ]
  }
};

function renderModuleAssessments() {
  document.querySelectorAll("[data-module-assessment]").forEach(container => {
    const moduleNumber = Number(container.dataset.moduleAssessment);
    const assessment = moduleAssessmentData[moduleNumber];
    if (!assessment) return;
    if (!activitiesComplete(moduleNumber)) {
      const completeCount = (state.moduleActivities[moduleNumber] || []).filter(Boolean).length;
      container.innerHTML = `<section class="assessment-panel"><p class="eyebrow">KNOWLEDGE CHECK LOCKED</p><h3>${assessment.title}</h3><p>Complete all three applied checkpoints in the module lab first. Current progress: ${completeCount}/3.</p><a class="button secondary" href="#module-${moduleNumber}">Return to Module ${String(moduleNumber).padStart(2,"0")}</a></section>`;
      return;
    }
    if (state.moduleChecks[moduleNumber]) {
      container.innerHTML = `<section class="assessment-panel assessment-passed"><p class="eyebrow">KNOWLEDGE CHECK PASSED</p><h3>${assessment.title}</h3><p>You have passed this checkpoint. The module completion reward is now unlocked.</p><span class="assessment-result-mark" aria-hidden="true">✓</span></section>`;
      return;
    }
    container.innerHTML = `<section class="assessment-panel"><p class="eyebrow">REQUIRED CHECKPOINT · MODULE ${String(moduleNumber).padStart(2,"0")}</p><h3>${assessment.title}</h3><p>${assessment.intro}</p><form class="module-assessment-form" data-assessment-form="${moduleNumber}">${assessment.questions.map((item, index) => `<fieldset class="assessment-question"><legend><span>Q${index+1}</span> ${item.q}</legend><div class="assessment-options">${item.a.map((answer, answerIndex) => `<label><input type="radio" name="m${moduleNumber}q${index}" value="${answerIndex}" required><span>${answer}</span></label>`).join("")}</div><p class="assessment-explanation" hidden>${item.why}</p></fieldset>`).join("")}<div class="assessment-submit-row"><button class="button primary" type="submit">Check Answers</button><span class="assessment-threshold">Pass mark: 2 of 3</span></div><p class="assessment-feedback" aria-live="polite"></p></form></section>`;
    const form = container.querySelector("form");
    form.addEventListener("submit", event => {
      event.preventDefault();
      const questions = [...form.querySelectorAll(".assessment-question")];
      if (questions.some(question => !question.querySelector("input:checked"))) {
        form.querySelector(".assessment-feedback").textContent = "Answer all three questions before checking your results.";
        return;
      }
      let score = 0;
      questions.forEach((question, index) => {
        const selected = Number(question.querySelector("input:checked").value);
        const correct = selected === assessment.questions[index].correct;
        if (correct) score++;
        question.classList.toggle("answer-correct", correct);
        question.classList.toggle("answer-incorrect", !correct);
        question.querySelector(".assessment-explanation").hidden = false;
        question.querySelectorAll("input").forEach(input => input.disabled = true);
      });
      const feedback = form.querySelector(".assessment-feedback");
      if (score >= 2) {
        state.moduleChecks[moduleNumber] = true;
        saveState();
        feedback.textContent = `Passed: ${score}/3 correct. Module completion is now unlocked.`;
        feedback.classList.add("success-message");
        updateUI();
        renderModuleAssessments();
        showToast(`Module ${String(moduleNumber).padStart(2,"0")} checkpoint passed`);
      } else {
        feedback.textContent = `Score: ${score}/3. Review the explanations, then retry the checkpoint.`;
        feedback.classList.add("error-message");
        const retry = document.createElement("button");
        retry.className = "button secondary";
        retry.type = "button";
        retry.textContent = "Retry Knowledge Check";
        retry.addEventListener("click", () => renderModuleAssessments());
        form.querySelector(".assessment-submit-row").appendChild(retry);
      }
      form.querySelector('button[type="submit"]').disabled = true;
    });
  });
}

function setupModuleCompletion() {
  document.querySelectorAll("[data-module-complete]").forEach(button => {
    button.addEventListener("click", () => completeModule(Number(button.dataset.moduleComplete)));
  });
}

const questions = [
  ["What is machine learning?", ["A monitor", "A way systems learn patterns from data", "A cable", "A browser"], 1],
  ["Why is data important?", ["It provides examples for learning", "It removes all errors", "It is hardware", "It is only for websites"], 0],
  ["What can neural networks learn?", ["Patterns", "Keyboard layouts only", "Internet passwords", "Screen size"], 0],
  ["Which is an everyday AI example?", ["Recommendation system", "USB cable", "Paper notebook", "Light switch"], 0],
  ["What is an AI hallucination?", ["Overheating", "Inaccurate output that sounds convincing", "A keyboard error", "A network cable"], 1]
];

function startQuiz() {
  const box = document.getElementById("quizApp");
  if (!box) return;
  let index = 0;
  let score = 0;

  function render() {
    if (index === questions.length) {
      box.innerHTML = `
        <div class="panel">
          <p class="eyebrow">RESULT</p>
          <h3>Score: ${score}/${questions.length}</h3>
          <p>${score >= 4 ? "Great work. You passed the fundamentals quiz." : "Review Module 1 and try again."}</p>
          <button class="button primary" id="quizDone" ${score >= 4 && state.challenges.quiz ? "disabled" : ""}>${score >= 4 ? (state.challenges.quiz ? "Reward Already Claimed ✓" : "Claim +50 XP") : "Try Again"}</button>
        </div>`;
      document.getElementById("quizDone").onclick = () => {
        if (score >= 4) {
          if (!state.challenges.quiz) awardXP(50, "quiz");
          else showToast("Quiz reward has already been claimed.");
        } else { index = 0; score = 0; render(); }
      };
      return;
    }

    const [question, answers, correct] = questions[index];
    box.innerHTML = `
      <p class="eyebrow">QUESTION ${index + 1} OF ${questions.length}</p>
      <h3>${question}</h3>
      <div class="scenario">
        ${answers.map((answer, n) => `<button class="answer" data-n="${n}">${answer}</button>`).join("")}
      </div>
      <div class="feedback"></div>`;

    box.querySelectorAll(".answer").forEach(button => {
      button.addEventListener("click", () => {
        const correctAnswer = Number(button.dataset.n) === correct;
        box.querySelectorAll(".answer").forEach(item => item.disabled = true);
        button.classList.add(correctAnswer ? "correct" : "wrong");
        box.querySelector(".feedback").textContent = correctAnswer ? "Correct!" : "Not quite.";
        if (correctAnswer) score++;
        window.setTimeout(() => { index++; render(); }, 650);
      });
    });
  }

  render();
}


function setupPromptBuilder() {
  const form = document.getElementById("modulePromptBuilder");
  if (!form) return;
  const task = document.getElementById("promptTask");
  const audience = document.getElementById("promptAudience");
  const context = document.getElementById("promptContext");
  const format = document.getElementById("promptFormat");
  const constraint = document.getElementById("promptConstraint");
  const output = document.getElementById("promptBuilderOutput");
  const status = document.getElementById("promptBuilderStatus");
  const copy = document.getElementById("copyPromptButton");
  const build = () => {
    const taskText = task.value.trim();
    if (!taskText) { status.textContent = "Enter a task first"; task.focus(); return ""; }
    const prompt = `Task: ${taskText}\nAudience: ${audience.value}\nContext: ${context.value.trim() || "No additional context supplied."}\nRequirements: ${constraint.value}\nOutput format: ${format.value}\nQuality check: Identify uncertainty and state which claims need independent verification. Do not invent sources.`;
    output.textContent = prompt;
    status.textContent = "Prompt assembled";
    return prompt;
  };
  form.addEventListener("submit", event => { event.preventDefault(); build(); });
  copy.addEventListener("click", async () => {
    const prompt = output.textContent.includes("Your assembled prompt") ? build() : output.textContent;
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      status.textContent = "Copied to clipboard";
      showToast("Prompt copied");
    } catch {
      const range = document.createRange();
      range.selectNodeContents(output);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      status.textContent = "Select the highlighted prompt and copy it";
    }
  });
}

function setupChallenges() {
  document.querySelectorAll(".scenario .answer[data-key]").forEach(button => {
    const challengeKey = button.dataset.key;
    const scenario = button.closest(".scenario");
    if (state.challenges[challengeKey]) {
      scenario.querySelectorAll(".answer[data-key]").forEach(item => item.disabled = true);
      const feedback = scenario.querySelector(".feedback");
      if (feedback) feedback.textContent = "Challenge already completed. Its XP reward has been claimed.";
      return;
    }
    button.addEventListener("click", () => {
      const box = button.closest(".scenario");
      const key = button.dataset.key;
      const correct = button.dataset.correct === "true";
      box.querySelectorAll(".answer").forEach(item => item.disabled = true);
      button.classList.add(correct ? "correct" : "wrong");
      box.querySelector(".feedback").textContent = correct ? "Correct. Nice work!" : "Review the lesson and try again.";
      if (correct) awardXP(75, key);
      else window.setTimeout(() => box.querySelectorAll(".answer").forEach(item => { item.disabled = false; item.classList.remove("wrong"); }), 800);
    });
  });
}

const glossaryTerms = [
  ["AI", "Artificial Intelligence", "The broad field involving computer systems designed to perform tasks associated with aspects of intelligence."],
  ["Algorithm", "Algorithm", "A defined sequence of steps or rules used to perform a task."],
  ["Bias", "Bias", "A systematic tendency that can affect data, systems, or outputs."],
  ["Data", "Data", "Information or examples that can be processed or used by an AI system."],
  ["Deepfake", "Deepfake", "Synthetic or manipulated media that can make content appear authentic."],
  ["Generative AI", "Generative AI", "AI systems designed to generate new content."],
  ["Hallucination", "Hallucination", "AI output that may sound convincing but is inaccurate."],
  ["Machine Learning", "Machine Learning", "A method in which systems learn patterns from data."],
  ["Neural Network", "Neural Network", "A computational model made from connected processing units."],
  ["Prompt", "Prompt", "An instruction or request given to an AI system."],
  ["Training Data", "Training Data", "Data used while training a machine learning system."],
  ["Misinformation", "Misinformation", "False or inaccurate information."]
];

function renderGlossary(query = "") {
  const grid = document.getElementById("glossaryGrid");
  if (!grid) return;
  const matches = glossaryTerms.filter(term => term.join(" ").toLowerCase().includes(query.toLowerCase()));
  grid.innerHTML = matches.length
    ? matches.map(term => `<article class="glossary-item"><span class="letter">${term[0][0]}</span><h3>${term[1]}</h3><p>${term[2]}</p></article>`).join("")
    : `<div class="panel"><h3>No matching terms</h3><p>Try another search.</p></div>`;
}

function applyAccessibilityState() {
  document.body.classList.toggle("high-contrast", !!state.settings.high);
  document.body.classList.toggle("large-text", !!state.settings.large);
  document.body.classList.toggle("reduce-motion", !!state.settings.reduceMotion);
  document.querySelectorAll("[data-access-setting]").forEach(control => {
    const setting = control.dataset.accessSetting;
    control.checked = !!state.settings[setting];
    control.setAttribute("aria-checked", String(!!state.settings[setting]));
  });
}

function buildAccessibilityModal() {
  if (document.getElementById("accessibilityModal")) return;
  const modal = document.createElement("div");
  modal.className = "accessibility-modal-backdrop";
  modal.id = "accessibilityModal";
  modal.hidden = true;
  modal.innerHTML = `
    <section class="accessibility-modal" role="dialog" aria-modal="true" aria-labelledby="accessibilityModalTitle" aria-describedby="accessibilityModalDescription" tabindex="-1">
      <div class="accessibility-modal-topline"><span class="accessibility-modal-icon" aria-hidden="true">A+</span><span class="accessibility-eyebrow">PERSONALIZE YOUR EXPERIENCE</span><button class="accessibility-close" type="button" aria-label="Close accessibility settings">×</button></div>
      <h2 id="accessibilityModalTitle">Accessibility settings</h2>
      <p class="accessibility-modal-description" id="accessibilityModalDescription">Adjust the learning portal to make reading and navigation more comfortable. Your preferences are saved on this device.</p>
      <div class="accessibility-setting-list">
        <label class="accessibility-setting-row"><span class="accessibility-setting-symbol" aria-hidden="true">Aa</span><span class="accessibility-setting-copy"><strong>Larger text</strong><small>Increase the size of page text for easier reading.</small></span><span class="accessibility-switch"><input type="checkbox" data-access-setting="large"><span aria-hidden="true"></span></span></label>
        <label class="accessibility-setting-row"><span class="accessibility-setting-symbol" aria-hidden="true">◐</span><span class="accessibility-setting-copy"><strong>High contrast</strong><small>Strengthen text and interface contrast.</small></span><span class="accessibility-switch"><input type="checkbox" data-access-setting="high"><span aria-hidden="true"></span></span></label>
        <label class="accessibility-setting-row"><span class="accessibility-setting-symbol" aria-hidden="true">◴</span><span class="accessibility-setting-copy"><strong>Reduce animations</strong><small>Minimize decorative movement and transitions.</small></span><span class="accessibility-switch"><input type="checkbox" data-access-setting="reduceMotion"><span aria-hidden="true"></span></span></label>
      </div>
      <div class="accessibility-modal-footer"><span class="accessibility-saved-note"><span aria-hidden="true">●</span> Preferences save automatically</span><button class="accessibility-done" type="button">Done <span aria-hidden="true">→</span></button></div>
    </section>`;
  document.body.appendChild(modal);
  const dialog = modal.querySelector(".accessibility-modal");
  const close = () => {
    modal.hidden = true;
    document.body.classList.remove("accessibility-modal-open");
    if (modal.returnFocus && modal.returnFocus.isConnected) modal.returnFocus.focus();
  };
  modal.querySelectorAll("[data-access-setting]").forEach(control => control.addEventListener("change", () => {
    state.settings[control.dataset.accessSetting] = control.checked;
    saveState();
    applyAccessibilityState();
  }));
  modal.querySelectorAll(".accessibility-close, .accessibility-done").forEach(button => button.addEventListener("click", close));
  modal.addEventListener("click", event => { if (event.target === modal) close(); });
  document.addEventListener("keydown", event => {
    if (modal.hidden) return;
    if (event.key === "Escape") { close(); return; }
    if (event.key === "Tab") {
      const focusable = [...modal.querySelectorAll('button, input, [tabindex="0"]')].filter(el => !el.disabled);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
}

function openAccessibility(event) {
  buildAccessibilityModal();
  const modal = document.getElementById("accessibilityModal");
  modal.returnFocus = event?.currentTarget || document.activeElement;
  modal.hidden = false;
  document.body.classList.add("accessibility-modal-open");
  applyAccessibilityState();
  requestAnimationFrame(() => modal.querySelector(".accessibility-modal").focus());
}

document.addEventListener("DOMContentLoaded", () => {
  renderModuleLabs();
  updateUI();
  renderModuleAssessments();
  setupModuleCompletion();
  setupPromptBuilder();
  startQuiz();
  setupChallenges();

  buildAccessibilityModal();
  document.querySelectorAll("#accessibilityButton").forEach(button => button.addEventListener("click", openAccessibility));
  document.querySelectorAll("#resourceAccessibility").forEach(button => button.addEventListener("click", openAccessibility));

  // Capstone self-check is a reflection aid and does not award XP.
  const capstoneChecks = [...document.querySelectorAll(".capstone-checks input[type=checkbox]")];
  const capstoneStatus = document.getElementById("capstoneStatus");
  const updateCapstone = () => {
    const checked = capstoneChecks.filter(input => input.checked).length;
    if (capstoneStatus) capstoneStatus.textContent = `${checked} of ${capstoneChecks.length} checks complete`;
  };
  capstoneChecks.forEach(input => input.addEventListener("change", updateCapstone));
  updateCapstone();

  const glossarySearch = document.getElementById("glossarySearch");
  if (glossarySearch) {
    renderGlossary();
    glossarySearch.addEventListener("input", () => renderGlossary(glossarySearch.value));
  }

  const routeButtons = {
    startLearningButton: "learn.html#module-1",
    quickStartButton: "learn.html#module-1",
    finalStartButton: "learn.html#module-1",
    dashboardStartButton: "dashboard.html",
    progressButton: "dashboard.html",
    quizButton: "challenges.html#quiz",
    promptButton: "challenges.html#prompt-challenge",
    ethicsButton: "challenges.html#ethics-challenge"
  };
  Object.entries(routeButtons).forEach(([id, destination]) => {
    const button = document.getElementById(id);
    if (button) button.addEventListener("click", () => { window.location.href = destination; });
  });

  const sampleQuestion = document.getElementById("sampleQuestion");
  if (sampleQuestion) {
    sampleQuestion.querySelectorAll("[data-answer]").forEach(button => button.addEventListener("click", () => {
      const feedback = document.getElementById("questionFeedback");
      const correct = button.dataset.answer === "correct";
      sampleQuestion.querySelectorAll("[data-answer]").forEach(option => {
        option.disabled = true;
        option.classList.toggle("correct", option === button && correct);
        option.classList.toggle("wrong", option === button && !correct);
      });
      if (feedback) feedback.textContent = correct
        ? "Correct. Machine learning identifies patterns from data; the resulting model can use those patterns on new inputs."
        : "Not quite. Machine learning is a way for systems to learn patterns from data. Try the full fundamentals quiz to practice more.";
      const retry = document.createElement("button");
      retry.className = "button secondary sample-retry";
      retry.type = "button";
      retry.textContent = "Try Another Time";
      retry.addEventListener("click", () => {
        sampleQuestion.querySelectorAll("[data-answer]").forEach(option => { option.disabled = false; option.classList.remove("correct", "wrong"); });
        if (feedback) feedback.textContent = "";
        retry.remove();
      });
      sampleQuestion.appendChild(retry);
    }));
  }
});
