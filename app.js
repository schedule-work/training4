/**
 * 개인정보보호 4회차 참여형 교육
 * - 스마트폰 풀스크린 GIF 스토리 엔진 (방식 A: 9:16 비율 고정 + 블러 배경)
 * - Google Apps Script(4회차-APPS/Code.gs) 및 1회차 관리자 대시보드 연동
 */

(function () {
  'use strict';

  // ==========================================
  // 0. Google Apps Script 연동 설정 (1회차 Admin.html SCENE04.webAppUrl)
  // ==========================================
  const APPS_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbwMM9fE1PnRgaCvhnbMZwnrrudy5sMoTiJyxDwDxvdS4PztExj2akBr0NsTfFeDH7a_2g/exec';

  // ==========================================
  // 1. Audio System (음원 폴더 + Web Audio Fallback)
  // ==========================================
  const AUDIO_PATHS = {
    bgm: encodeURI('음원/배경음악.mp3'),
    tap: encodeURI('음원/선택.wav'),
    confirm: encodeURI('음원/선택2.wav'),
    subtitle: encodeURI('음원/자막.mp3')
  };

  let audioCtx = null;
  let isSoundEnabled = true;
  let bgmAudio = null;
  let subtitleAudio = null;
  const decodedSfxBuffers = { tap: null, confirm: null };
  const decodedSfxLoading = { tap: false, confirm: false };

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    ensureSfxBuffer('tap');
    ensureSfxBuffer('confirm');
  }

  function ensureBgmAudio() {
    if (!bgmAudio) {
      bgmAudio = new Audio(AUDIO_PATHS.bgm);
      bgmAudio.loop = true;
      bgmAudio.volume = 0.24;
      bgmAudio.preload = 'auto';
    }
    return bgmAudio;
  }

  function ensureSubtitleAudio() {
    if (!subtitleAudio) {
      subtitleAudio = new Audio(AUDIO_PATHS.subtitle);
      subtitleAudio.loop = true;
      subtitleAudio.volume = 0.38;
      subtitleAudio.preload = 'auto';
    }
    return subtitleAudio;
  }

  function ensureSfxBuffer(key) {
    if (decodedSfxBuffers[key] || decodedSfxLoading[key]) return;
    if (!audioCtx || window.location.protocol === 'file:') return;
    decodedSfxLoading[key] = true;
    fetch(AUDIO_PATHS[key])
      .then((resp) => (resp.ok ? resp.arrayBuffer() : null))
      .then((buf) => (buf && audioCtx ? audioCtx.decodeAudioData(buf) : null))
      .then((decoded) => {
        if (decoded) decodedSfxBuffers[key] = decoded;
      })
      .catch(() => {})
      .finally(() => {
        decodedSfxLoading[key] = false;
      });
  }

  function playSfxFile(key, volume) {
    if (!isSoundEnabled) return;
    initAudio();
    const buffer = decodedSfxBuffers[key];
    if (audioCtx && buffer) {
      try {
        const source = audioCtx.createBufferSource();
        const gain = audioCtx.createGain();
        source.buffer = buffer;
        gain.gain.setValueAtTime(volume, audioCtx.currentTime);
        source.connect(gain);
        gain.connect(audioCtx.destination);
        source.start(0);
        return;
      } catch (ignore) {}
    }
    try {
      const audio = new Audio(AUDIO_PATHS[key]);
      audio.volume = volume;
      audio.play().catch(() => {});
    } catch (ignore) {}
  }

  function startBgm() {
    if (!isSoundEnabled || !isStarted || isEnded || document.hidden) return;
    const audio = ensureBgmAudio();
    if (audio.paused) {
      audio.play().catch(() => {});
    }
  }

  function pauseBgm(reset) {
    if (!bgmAudio) return;
    bgmAudio.pause();
    if (reset) {
      bgmAudio.currentTime = 0;
    }
  }

  function startSubtitleSfx() {
    if (!isSoundEnabled || !isStarted || isEnded || document.hidden || !isTyping) return;
    const audio = ensureSubtitleAudio();
    try {
      if (audio.paused) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    } catch (ignore) {}
  }

  function stopSubtitleSfx() {
    if (!subtitleAudio) return;
    subtitleAudio.pause();
    try {
      subtitleAudio.currentTime = 0;
    } catch (ignore) {}
  }

  const Sound = {
    elevatorChime: function () {
      if (!isSoundEnabled) return;
      initAudio();
      if (!audioCtx) return;

      const now = audioCtx.currentTime;
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(440, now + 0.28);
      gain2.gain.setValueAtTime(0.22, now + 0.28);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.28);
      osc2.stop(now + 1.2);
    },

    tap: function () {
      playSfxFile('tap', 0.55);
    },

    confirm: function () {
      playSfxFile('confirm', 0.6);
    },

    snap: function () {
      playSfxFile('confirm', 0.6);
    },

    correct: function () {
      if (!isSoundEnabled) return;
      initAudio();
      if (!audioCtx) return;

      const now = audioCtx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.15, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.45);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.45);
      });
    },

    heartbeat: function () {
      if (!isSoundEnabled) return;
      initAudio();
      if (!audioCtx) return;

      const now = audioCtx.currentTime;
      [0, 0.24].forEach((offset) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(75, now + offset);
        osc.frequency.exponentialRampToValueAtTime(42, now + offset + 0.18);
        gain.gain.setValueAtTime(0.28, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.22);
      });
    },

    dangerAlert: function () {
      if (!isSoundEnabled) return;
      initAudio();
      if (!audioCtx) return;

      const now = audioCtx.currentTime;
      [0, 0.18].forEach((offset) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(660, now + offset);
        osc.frequency.setValueAtTime(880, now + offset + 0.07);
        gain.gain.setValueAtTime(0.16, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.16);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.17);
      });
    }
  };

  // ==========================================
  // 2. Story Timeline (12 Unique GIFs + Narration/Speech Separation + Real Branch)
  // ==========================================
  const CHAPTER_LABELS = {
    1: '1/5 엘리베이터 탑승',
    2: '2/5 상황 전개',
    3: '3/5 나의 선택',
    4: '4/5 정보 결합 · 주의 공간',
    5: '5/5 정답 및 의견 제출'
  };

  const KIND_LABELS = {
    narration: '설명',
    speech: '대화',
    thought: '속마음'
  };

  const STORY_STEPS = [
    {
      id: '4-1-1',
      type: 'dialogue',
      kind: 'narration',
      chapter: 1,
      floor: '07F',
      gif: 'webp/Nurses_talking_in_elevator_8afa24f8.webp',
      speaker: '상황 설명',
      role: 'narration',
      text: '오전 회진이 끝난 뒤였다.\n지윤과 동료는 다른 층으로 이동하기 위해 엘리베이터에 탔다.',
      holdMs: 3600,
      nextId: '4-1-2'
    },
    {
      id: '4-1-2',
      type: 'dialogue',
      kind: 'speech',
      chapter: 1,
      floor: '07F',
      gif: 'webp/Nurses_talking_in_elevator_8afa24f8.webp',
      speaker: '지윤 간호사',
      role: 'jiyun',
      text: '"아까 회진 돌았던 환자분 말이야."',
      holdMs: 3000,
      nextId: '4-1-3'
    },
    {
      id: '4-1-3',
      type: 'dialogue',
      kind: 'speech',
      chapter: 1,
      floor: '07F',
      gif: 'webp/Nurses_talking_in_elevator_771bf125.webp',
      speaker: '동료 간호사',
      role: 'colleague',
      text: '"아, 그분? 나도 방금 회진 끝나고 좀 신경 쓰이긴 했는데."',
      holdMs: 3400,
      nextId: '4-1-4'
    },
    {
      id: '4-1-4',
      type: 'dialogue',
      kind: 'narration',
      chapter: 1,
      floor: '07F',
      gif: 'webp/Woman_standing_in_elevator_93eec380.webp',
      speaker: '상황 설명',
      role: 'narration',
      text: '그때 엘리베이터 한쪽에 처음 보는 사람이 함께 타고 있는 것이 보였다.\n병원 직원은 아닌 것 같았지만, 누구인지는 알 수 없었다.',
      holdMs: 3800,
      nextId: 'choice-1'
    },
    {
      id: 'choice-1',
      type: 'choice1',
      chapter: 1,
      floor: '07F',
      gif: 'webp/Woman_standing_in_elevator_93eec380.webp'
    },

    // Branch A: 모범 대처 분기
    {
      id: 'safe-1',
      type: 'dialogue',
      kind: 'speech',
      chapter: 2,
      floor: '07F',
      gif: 'webp/Nurse_nodding_in_elevator_1edc08f8.webp',
      speaker: '지윤 간호사',
      role: 'jiyun',
      text: '"잠깐, 우리 엘리베이터 안이니까 내린 뒤에 조용한 곳에서 이야기하자."',
      holdMs: 3600,
      nextId: 'safe-2'
    },
    {
      id: 'safe-2',
      type: 'dialogue',
      kind: 'narration',
      chapter: 2,
      floor: '06F',
      gif: 'webp/Woman_stepping_out_of_elevator_46d1ab01.webp',
      speaker: '상황 설명',
      role: 'narration',
      text: '6층에서 함께 타고 있던 승객이 내렸다.\n구체적인 환자 이야기를 꺼내기 전에 대화를 멈춘 덕분에 환자의 정보는 전혀 노출되지 않았다.',
      holdMs: 3800,
      sfx: 'elevatorChime',
      nextId: 'safe-result'
    },
    {
      id: 'safe-result',
      type: 'safeResult',
      chapter: 2,
      floor: '06F',
      gif: 'webp/Nurse_raising_index_finger_13f6be98.webp'
    },

    // Branch B: 위험 시나리오 - 장면 4-2 (대화를 이어가며 4가지 단서 노출)
    {
      id: '4-2-1',
      type: 'dialogue',
      kind: 'narration',
      chapter: 2,
      floor: '07F',
      gif: 'webp/Nurses_whispering_in_elevator_681480a8.webp',
      speaker: '상황 설명',
      role: 'narration',
      text: '동료가 작은 목소리로 속삭이듯 말했다.',
      holdMs: 2800,
      nextId: '4-2-2'
    },
    {
      id: '4-2-2',
      type: 'dialogue',
      kind: 'speech',
      chapter: 2,
      floor: '07F',
      gif: 'webp/Nurses_whispering_in_elevator_681480a8.webp',
      speaker: '동료 간호사',
      role: 'colleague',
      text: '"이름만 말 안 하면 이 정도는 괜찮지 않을까?"',
      holdMs: 3400,
      nextId: '4-2-3'
    },
    {
      id: '4-2-3',
      type: 'dialogue',
      kind: 'narration',
      chapter: 2,
      floor: '07F',
      gif: 'webp/Nurse_nodding_in_elevator_1edc08f8.webp',
      speaker: '상황 설명',
      role: 'narration',
      text: '지윤도 별다른 생각 없이 고개를 끄덕이며 대화를 이어갔다.',
      holdMs: 3200,
      nextId: '4-2-4'
    },
    {
      id: '4-2-4',
      type: 'dialogue',
      kind: 'speech',
      chapter: 2,
      floor: '07F',
      gif: 'webp/Nurses_talking_in_elevator_771bf125.webp',
      speaker: '지윤 간호사',
      role: 'jiyun',
      text: '"701호 어제 입원한 분 말인데, 따님 보호자분이 걱정을 많이 하시더라고."',
      holdMs: 3800,
      nextId: '4-2-5'
    },
    {
      id: '4-2-5',
      type: 'dialogue',
      kind: 'speech',
      chapter: 2,
      floor: '07F',
      gif: 'webp/Nurses_whispering_in_elevator_681480a8.webp',
      speaker: '동료 간호사',
      role: 'colleague',
      text: '"아침에 찍은 CT에 이상 소견이 나와서 오후에 주치의 면담 잡아야 할 것 같아."',
      holdMs: 3800,
      nextId: '4-2-6'
    },
    {
      id: '4-2-6',
      type: 'dialogue',
      kind: 'narration',
      chapter: 2,
      floor: '06F',
      gif: 'webp/Woman_stepping_out_of_elevator_46d1ab01.webp',
      speaker: '상황 설명',
      role: 'narration',
      text: '다음 층에서 함께 있던 그 사람이 내리며 휴대전화를 꺼냈다.',
      holdMs: 4200,
      sfx: 'elevatorChime',
      nextId: '4-2-7'
    },
    {
      id: '4-2-7',
      type: 'dialogue',
      kind: 'thought',
      chapter: 2,
      floor: '06F',
      gif: 'webp/Woman_looking_at_phone_61aff9d5.webp',
      speaker: '탑승객',
      role: 'passenger',
      text: '"그 병실이면 혹시…."',
      holdMs: 3400,
      nextId: '4-2-8'
    },
    {
      id: '4-2-8',
      type: 'dialogue',
      kind: 'narration',
      chapter: 2,
      floor: '06F',
      gif: 'webp/Woman_standing_in_elevator_92ed84d2.webp',
      speaker: '상황 설명',
      role: 'narration',
      text: '그때, 지윤은 문득 생각했다.',
      holdMs: 3000,
      sfx: 'heartbeat',
      nextId: '4-2-9'
    },
    {
      id: '4-2-9',
      type: 'dialogue',
      kind: 'thought',
      chapter: 2,
      floor: '06F',
      gif: 'webp/Woman_resting_chin_thoughtfully_1d7844eb.webp',
      speaker: '지윤 간호사',
      role: 'jiyun',
      text: '"병실 번호, 입원 시기, 보호자 상황, 검사 결과만으로도 누군가는 누구의 이야기인지 알아챌 수 있다는 것을…!"',
      holdMs: 4200,
      nextId: '4-3-intro'
    },

    // Chapter 3: 장면 4-3
    {
      id: '4-3-intro',
      type: 'dialogue',
      kind: 'thought',
      chapter: 3,
      floor: '06F',
      gif: 'webp/Nurse_looking_at_phone_3937579d.webp',
      speaker: '지윤 간호사',
      role: 'jiyun',
      text: '"잠깐, 다시 생각해 보자.\n실제로 이런 상황이라면 나는 어떻게 행동해야 할까?"',
      holdMs: 3500,
      nextId: '4-3'
    },
    {
      id: '4-3',
      type: 'quiz',
      chapter: 3,
      floor: '06F',
      gif: 'webp/Nurse_looking_at_phone_3937579d.webp'
    },

    // Chapter 4: 장면 4-4
    {
      id: '4-4-intro',
      type: 'dialogue',
      kind: 'narration',
      chapter: 4,
      floor: '06F',
      gif: 'webp/Nurse_thinking_at_desk_586b65fc.webp',
      speaker: '상황 설명',
      role: 'narration',
      text: '환자 정보는 이름이나 등록번호만을 의미하지 않습니다.\n작은 정보들이 모이면 특정 환자를 알아볼 수 있습니다.',
      holdMs: 4000,
      nextId: '4-4-1'
    },
    {
      id: '4-4-1',
      type: 'puzzle',
      chapter: 4,
      floor: '06F',
      gif: 'webp/Nurse_thinking_at_desk_586b65fc.webp'
    },
    {
      id: '4-4-2-intro',
      type: 'dialogue',
      kind: 'speech',
      chapter: 4,
      floor: '06F',
      gif: 'webp/Nurse_raising_index_finger_13f6be98.webp',
      speaker: '지윤 간호사',
      role: 'jiyun',
      text: '"밀폐된 공간처럼 느껴지는 엘리베이터 역시 누구나 함께 이용하는 공개된 장소임을 잊지 말아야 합니다."',
      holdMs: 4000,
      nextId: '4-4-2'
    },
    {
      id: '4-4-2',
      type: 'places',
      chapter: 4,
      floor: '06F',
      gif: 'webp/Nurse_raising_index_finger_13f6be98.webp'
    },

    // Chapter 5: 장면 4-5
    {
      id: '4-5',
      type: 'summary',
      chapter: 5,
      floor: '06F',
      gif: 'webp/Nurse_raising_index_finger_13f6be98.webp'
    }
  ];

  // ==========================================
  // 3. Google Sheets Data Bridge
  // ==========================================
  function generateAnonymousUuid() {
    const randomPart =
      window.crypto && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, '')
        : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
    return `anon_${randomPart}`;
  }

  function hasGasIframeBridge() {
    return !!(window.google && google.script && google.script.run);
  }

  function hasRemoteAppsScriptUrl() {
    return typeof APPS_SCRIPT_URL === 'string' && APPS_SCRIPT_URL.trim().length > 20;
  }

  function parseJsonResponseText(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed || trimmed.charAt(0) === '<') {
      throw new Error('APPS_SCRIPT_HTML_RESPONSE');
    }
    return JSON.parse(trimmed);
  }

  function formatApiError(err, fallbackMsg) {
    if (window.location.protocol === 'file:') {
      return '로컬 파일(file://) 직접 실행에서는 시트 연동이 제한됩니다. 웹 주소(GitHub Pages 또는 http://localhost)로 열어 주세요.';
    }
    const msg = err && err.message ? err.message : '';
    if (msg === 'APPS_SCRIPT_HTML_RESPONSE') {
      return '구글 Apps Script에 최신 Code.gs가 배포되지 않았습니다. 새 버전으로 배포 후 다시 시도해 주세요.';
    }
    if (err && err.name === 'AbortError') {
      return '응답 대기 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.';
    }
    return msg || fallbackMsg;
  }

  async function apiLoadDepartments() {
    if (hasGasIframeBridge()) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .getDepartmentList();
      });
    }
    if (!hasRemoteAppsScriptUrl()) {
      throw new Error('Apps Script URL이 설정되지 않았습니다.');
    }
    const sep = APPS_SCRIPT_URL.indexOf('?') === -1 ? '?' : '&';
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 15000) : null;
    try {
      const resp = await fetch(`${APPS_SCRIPT_URL}${sep}page=departments`, {
        method: 'GET',
        redirect: 'follow',
        signal: controller ? controller.signal : undefined
      });
      if (!resp.ok) {
        throw new Error(`HTTP_${resp.status}`);
      }
      const text = await resp.text();
      const json = parseJsonResponseText(text);
      if (json && json.ok && Array.isArray(json.departments) && json.departments.length > 0) {
        return json.departments;
      }
      throw new Error((json && json.error) || '부서 목록이 비어 있습니다.');
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  async function apiPostAction(payload) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 15000) : null;
    try {
      const resp = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow',
        signal: controller ? controller.signal : undefined
      });
      if (!resp.ok) {
        throw new Error(`HTTP_${resp.status}`);
      }
      const text = await resp.text();
      const json = parseJsonResponseText(text);
      if (!json || !json.ok) {
        throw new Error((json && json.error) || '요청 처리 중 오류가 발생했습니다.');
      }
      return json;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  async function apiSubmitQuiz(dept, ans, uuid) {
    if (hasGasIframeBridge()) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .processQuizSubmission(dept, ans, uuid);
      });
    }
    if (!hasRemoteAppsScriptUrl()) {
      throw new Error('Apps Script URL이 설정되지 않았습니다.');
    }
    const json = await apiPostAction({
      action: 'submitQuiz',
      department: dept,
      selectedAnswer: ans,
      anonymousId: uuid
    });
    return json.stats;
  }

  async function apiSubmitFeedback(dept, reason, idea) {
    if (hasGasIframeBridge()) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .processFeedbackSubmission(dept, reason, idea);
      });
    }
    if (!hasRemoteAppsScriptUrl()) {
      throw new Error('Apps Script URL이 설정되지 않았습니다.');
    }
    await apiPostAction({
      action: 'submitFeedback',
      department: dept,
      reason: reason,
      idea: idea
    });
    return true;
  }

  // ==========================================
  // 4. DOM References & App State
  // ==========================================
  const gifBackdrop = document.getElementById('gifBackdrop');
  const gifStageA = document.getElementById('gifStageA');
  const gifStageB = document.getElementById('gifStageB');
  const gifStageLayers = [gifStageA, gifStageB];
  const storySegments = document.getElementById('storySegments');
  const chapterBadge = document.getElementById('chapterBadge');
  const floorBadge = document.getElementById('floorBadge');
  const autoToggleBtn = document.getElementById('autoToggleBtn');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundOnIcon = document.getElementById('soundOnIcon');
  const soundOffIcon = document.getElementById('soundOffIcon');
  const restartBtn = document.getElementById('restartBtn');

  const hudTop = document.getElementById('hudTop');
  const tapCatcher = document.getElementById('tapCatcher');
  const startOverlay = document.getElementById('startOverlay');
  const startEduBtn = document.getElementById('startEduBtn');
  const submitCompleteModal = document.getElementById('submitCompleteModal');
  const confirmEndEduBtn = document.getElementById('confirmEndEduBtn');
  const endOverlay = document.getElementById('endOverlay');
  const endDeptMeta = document.getElementById('endDeptMeta');

  const dialogueOverlay = document.getElementById('dialogueOverlay');
  const dialogueCard = document.getElementById('dialogueCard');
  const autoProgressBar = document.getElementById('autoProgressBar');
  const speakerBadge = document.getElementById('speakerBadge');
  const kindBadge = document.getElementById('kindBadge');
  const beatCounter = document.getElementById('beatCounter');
  const dialogueText = document.getElementById('dialogueText');
  const prevBeatBtn = document.getElementById('prevBeatBtn');
  const nextBeatBtn = document.getElementById('nextBeatBtn');
  const tapHintText = document.getElementById('tapHintText');

  const interactiveSheet = document.getElementById('interactiveSheet');
  const panelChoice1 = document.getElementById('panelChoice1');
  const panelSafeResult = document.getElementById('panelSafeResult');
  const panelQuiz = document.getElementById('panelQuiz');
  const panelPuzzle = document.getElementById('panelPuzzle');
  const panelPlaces = document.getElementById('panelPlaces');
  const panelSummary = document.getElementById('panelSummary');

  const preloadedGifs = new Set();
  const historyStack = [];
  let currentStepId = '4-1-1';
  let isStarted = false;
  let isEnded = false;
  let isAutoPlay = true;
  let typingTimer = null;
  let autoTimer = null;
  let quizCycleTimer = null;
  let isTyping = false;
  let activeGifUrl = 'webp/Nurses_talking_in_elevator_8afa24f8.webp';
  let activeLayerIdx = 0;
  let stageLoadSeq = 0;
  let selectedChoice1 = null;
  let lastFloor = '07F';

  // Participation state
  let selectedQuizOption = null;
  let submittedAnswer = null;
  let selectedDepartment = '';
  let latestDeptStats = null;
  let isSubmittingQuiz = false;
  let selectedFeedbackPlace = '';
  let isFeedbackSubmitted = false;

  function getStepById(id) {
    return STORY_STEPS.find((s) => s.id === id);
  }

  function getStepIndex(id) {
    return STORY_STEPS.findIndex((s) => s.id === id);
  }

  // ==========================================
  // 5. Stage, Segments & Auto-Advance Engine
  // ==========================================
  function initSegments() {
    if (!storySegments) return;
    storySegments.innerHTML = '';
    for (let ch = 1; ch <= 5; ch++) {
      const seg = document.createElement('div');
      seg.className = 'segment-item';
      seg.setAttribute('data-chapter', String(ch));
      seg.innerHTML = '<div class="segment-fill"></div>';
      storySegments.appendChild(seg);
    }
  }

  function updateSegments(step) {
    const ch = step.chapter;
    const isSafeBranch = step.id.startsWith('safe-');
    const chSteps = STORY_STEPS.filter((s) =>
      isSafeBranch
        ? s.id.startsWith('safe-')
        : s.chapter === ch && !s.id.startsWith('safe-')
    );
    const posInCh = chSteps.findIndex((s) => s.id === step.id);
    const ratio = posInCh >= 0 && chSteps.length > 0
      ? Math.round(((posInCh + 1) / chSteps.length) * 100)
      : 50;

    document.querySelectorAll('.segment-item').forEach((seg) => {
      const segCh = Number(seg.getAttribute('data-chapter'));
      const fill = seg.querySelector('.segment-fill');
      seg.classList.remove('done', 'active');
      if (segCh < ch) {
        seg.classList.add('done');
        if (fill) fill.style.width = '100%';
      } else if (segCh === ch) {
        seg.classList.add('active');
        if (fill) fill.style.width = `${ratio}%`;
      } else {
        if (fill) fill.style.width = '0%';
      }
    });
  }

  function preloadGif(url) {
    if (!url || preloadedGifs.has(url)) return;
    preloadedGifs.add(url);
    const img = new Image();
    img.src = url;
  }

  function preloadAhead(step) {
    if (!step) return;
    preloadGif(step.gif);
    if (step.nextId) {
      const n1 = getStepById(step.nextId);
      if (n1) {
        preloadGif(n1.gif);
        if (n1.nextId) {
          const n2 = getStepById(n1.nextId);
          if (n2) preloadGif(n2.gif);
        }
      }
    }
    if (
      step.id === '4-1-3' ||
      step.id === '4-1-4' ||
      step.id === 'choice-1' ||
      step.id.startsWith('safe-')
    ) {
      [
        'safe-1',
        'safe-2',
        'safe-result',
        '4-2-1',
        '4-2-2',
        '4-2-3',
        '4-2-4',
        '4-2-5',
        '4-2-6',
        '4-2-7',
        '4-2-8',
        '4-2-9',
        '4-3-intro',
        '4-3'
      ].forEach((targetId) => {
        const targetStep = getStepById(targetId);
        if (targetStep) preloadGif(targetStep.gif);
      });
    }
  }

  function waitImageReady(imgEl, url, expectedSeq) {
    if (!imgEl) return Promise.resolve(true);
    return new Promise((resolve) => {
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        resolve(Boolean(ok && expectedSeq === stageLoadSeq && imgEl.naturalWidth > 0));
      };
      if (imgEl.getAttribute('src') === url && imgEl.complete && imgEl.naturalWidth > 0) {
        finish(true);
        return;
      }
      imgEl.onload = () => finish(true);
      imgEl.onerror = () => finish(false);
      imgEl.src = url;
      if (imgEl.complete && imgEl.naturalWidth > 0) {
        finish(true);
      }
    });
  }

  let layerRetireTimer = null;
  let isStageReadyForCurrentStep = true;
  let activeStageReadyPromise = Promise.resolve();

  function setStageGif(url) {
    if (!url || activeGifUrl === url) {
      isStageReadyForCurrentStep = true;
      activeStageReadyPromise = Promise.resolve();
      return activeStageReadyPromise;
    }
    activeGifUrl = url;
    const seq = ++stageLoadSeq;
    const nextIdx = activeLayerIdx === 0 ? 1 : 0;
    const currStage = gifStageLayers[activeLayerIdx];
    const nextStage = gifStageLayers[nextIdx];

    if (!currStage || !nextStage) {
      isStageReadyForCurrentStep = true;
      activeStageReadyPromise = Promise.resolve();
      return activeStageReadyPromise;
    }

    isStageReadyForCurrentStep = false;
    activeStageReadyPromise = waitImageReady(nextStage, url, seq).then((ready) => {
      if (seq !== stageLoadSeq) return;
      if (ready) {
        if (layerRetireTimer) {
          clearTimeout(layerRetireTimer);
          layerRetireTimer = null;
        }
        currStage.classList.remove('is-top');
        nextStage.classList.add('is-top', 'is-visible');
        activeLayerIdx = nextIdx;
        if (gifBackdrop) {
          gifBackdrop.src = url;
        }

        layerRetireTimer = setTimeout(() => {
          if (seq !== stageLoadSeq) return;
          currStage.classList.remove('is-visible');
        }, 240);
      }
      isStageReadyForCurrentStep = true;
    });
    return activeStageReadyPromise;
  }

  const QUIZ_BG_CYCLE = [
    'webp/Nurse_looking_at_phone_3937579d.webp',
    'webp/Nurses_talking_in_elevator_8afa24f8.webp',
    'webp/Woman_standing_in_elevator_93eec380.webp',
    'webp/Woman_resting_chin_thoughtfully_1d7844eb.webp'
  ];

  function startQuizBgCycle() {
    QUIZ_BG_CYCLE.forEach(preloadGif);
    let cycleIdx = 0;
    quizCycleTimer = setInterval(() => {
      if (currentStepId !== '4-3') {
        clearInterval(quizCycleTimer);
        quizCycleTimer = null;
        return;
      }
      cycleIdx = (cycleIdx + 1) % QUIZ_BG_CYCLE.length;
      setStageGif(QUIZ_BG_CYCLE[cycleIdx]);
    }, 4000);
  }

  function clearTimers() {
    if (typingTimer) {
      clearInterval(typingTimer);
      typingTimer = null;
    }
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
    if (quizCycleTimer) {
      clearInterval(quizCycleTimer);
      quizCycleTimer = null;
    }
    if (typeof stopPuzzleAutoPlay === 'function') {
      stopPuzzleAutoPlay();
    }
    isTyping = false;
    stopSubtitleSfx();
    if (autoProgressBar) {
      autoProgressBar.style.width = '0%';
    }
  }

  function hideAllSheets() {
    if (interactiveSheet) interactiveSheet.classList.remove('active');
    [panelChoice1, panelSafeResult, panelQuiz, panelPuzzle, panelPlaces, panelSummary].forEach((p) => {
      if (p) p.classList.remove('active');
    });
  }

  function startHoldTimer(step) {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
    if (!isAutoPlay) {
      if (autoProgressBar) autoProgressBar.style.width = '0%';
      return;
    }

    const targetStepId = step.id;
    const beginCountdown = () => {
      if (!isAutoPlay || currentStepId !== targetStepId || isTyping) return;
      if (autoTimer) {
        clearInterval(autoTimer);
        autoTimer = null;
      }
      const duration = step.holdMs || 3500;
      const startAt = Date.now();
      autoTimer = setInterval(() => {
        if (!isAutoPlay || currentStepId !== targetStepId) {
          clearInterval(autoTimer);
          autoTimer = null;
          if (autoProgressBar) autoProgressBar.style.width = '0%';
          return;
        }
        const elapsed = Date.now() - startAt;
        const pct = Math.min(100, (elapsed / duration) * 100);
        if (autoProgressBar) {
          autoProgressBar.style.width = `${pct}%`;
        }
        if (elapsed >= duration) {
          clearInterval(autoTimer);
          autoTimer = null;
          goNextStep();
        }
      }, 50);
    };

    if (isStageReadyForCurrentStep) {
      beginCountdown();
    } else {
      if (autoProgressBar) autoProgressBar.style.width = '0%';
      activeStageReadyPromise.then(beginCountdown);
    }
  }

  function finishTypingImmediately(step) {
    if (typingTimer) {
      clearInterval(typingTimer);
      typingTimer = null;
    }
    isTyping = false;
    stopSubtitleSfx();
    if (dialogueText) {
      dialogueText.textContent = step.text;
    }
    startHoldTimer(step);
  }

  function renderDialogueStep(step) {
    hideAllSheets();
    if (dialogueOverlay) dialogueOverlay.classList.add('active');
    if (tapCatcher) tapCatcher.style.display = 'block';

    const kind = step.kind || 'narration';
    if (dialogueCard) {
      dialogueCard.className = `dialogue-card kind-${kind}`;
    }
    if (kindBadge) {
      kindBadge.textContent = KIND_LABELS[kind] || '설명';
    }
    if (speakerBadge) {
      speakerBadge.textContent = step.speaker;
      speakerBadge.className = `speaker-badge role-${step.role || 'narration'}`;
    }
    if (beatCounter) {
      const idx = getStepIndex(step.id);
      beatCounter.textContent = `${idx + 1} / ${STORY_STEPS.length}`;
    }
    if (prevBeatBtn) {
      prevBeatBtn.disabled = historyStack.length === 0;
    }
    if (tapHintText) {
      tapHintText.textContent = isAutoPlay
        ? '자동 진행 중 · 터치하면 바로 넘어갑니다'
        : '화면을 터치하면 다음 장면으로 이동';
    }

    const fullText = step.text;
    let visibleSpan = null;
    let ghostSpan = null;
    if (dialogueText) {
      dialogueText.innerHTML = '';
      visibleSpan = document.createElement('span');
      ghostSpan = document.createElement('span');
      ghostSpan.className = 'dialogue-text-ghost';
      ghostSpan.setAttribute('aria-hidden', 'true');
      ghostSpan.textContent = fullText;
      dialogueText.appendChild(visibleSpan);
      dialogueText.appendChild(ghostSpan);
    }

    isTyping = true;
    startSubtitleSfx();
    let charPos = 0;

    typingTimer = setInterval(() => {
      charPos += 1;
      if (visibleSpan && ghostSpan) {
        visibleSpan.textContent = fullText.slice(0, charPos);
        ghostSpan.textContent = fullText.slice(charPos);
      }
      if (charPos >= fullText.length) {
        finishTypingImmediately(step);
      }
    }, 26);
  }

  function navigateTo(stepId, pushHistory) {
    const step = getStepById(stepId);
    if (!step) return;

    if (pushHistory && currentStepId && currentStepId !== stepId) {
      historyStack.push(currentStepId);
    }

    clearTimers();
    currentStepId = stepId;

    preloadAhead(step);
    setStageGif(step.gif);
    updateSegments(step);

    if (chapterBadge) {
      chapterBadge.textContent = CHAPTER_LABELS[step.chapter] || '';
    }
    if (floorBadge) {
      floorBadge.textContent = step.floor;
      floorBadge.classList.toggle('arrived', step.floor === '06F');
    }

    if (step.sfx === 'elevatorChime' && lastFloor !== step.floor) {
      Sound.elevatorChime();
    } else if (step.sfx && step.sfx !== 'elevatorChime' && Sound[step.sfx]) {
      Sound[step.sfx]();
    }
    lastFloor = step.floor;

    if (step.type === 'dialogue') {
      renderDialogueStep(step);
      return;
    }

    if (dialogueOverlay) dialogueOverlay.classList.remove('active');
    if (tapCatcher) tapCatcher.style.display = 'none';
    hideAllSheets();
    if (interactiveSheet) interactiveSheet.classList.add('active');

    if (step.type === 'choice1' && panelChoice1) {
      clearChoice1Selection();
      panelChoice1.classList.add('active');
    } else if (step.type === 'safeResult' && panelSafeResult) {
      panelSafeResult.classList.add('active');
    } else if (step.type === 'quiz' && panelQuiz) {
      renderQuizPanel();
      panelQuiz.classList.add('active');
      startQuizBgCycle();
    } else if (step.type === 'puzzle' && panelPuzzle) {
      panelPuzzle.classList.add('active');
      startPuzzleAutoPlay();
    } else if (step.type === 'places' && panelPlaces) {
      panelPlaces.classList.add('active');
    } else if (step.type === 'summary' && panelSummary) {
      renderSummaryView();
      panelSummary.classList.add('active');
    }
  }

  function goNextStep() {
    const step = getStepById(currentStepId);
    if (step && step.nextId) {
      navigateTo(step.nextId, true);
    }
  }

  function goPrevStep() {
    if (historyStack.length > 0) {
      Sound.tap();
      const prevId = historyStack.pop();
      navigateTo(prevId, false);
    }
  }

  // ==========================================
  // 6. Start, HUD & Tap Controls
  // ==========================================
  if (startEduBtn) {
    startEduBtn.addEventListener('click', function () {
      const dept = deptSelect ? deptSelect.value.trim() : '';
      if (!dept) return;
      selectedDepartment = dept;
      if (quizDeptPill) quizDeptPill.textContent = dept;

      isStarted = true;
      isEnded = false;
      initAudio();
      Sound.confirm();
      startBgm();
      historyStack.length = 0;
      if (startOverlay) startOverlay.classList.remove('active');
      if (endOverlay) endOverlay.classList.remove('active');
      if (hudTop) hudTop.style.display = '';
      navigateTo('4-1-1', false);
    });
  }

  if (tapCatcher) {
    tapCatcher.addEventListener('click', function () {
      if (!isStarted) return;
      const step = getStepById(currentStepId);
      if (!step || step.type !== 'dialogue') return;
      if (isTyping) {
        finishTypingImmediately(step);
      } else {
        Sound.tap();
        goNextStep();
      }
    });
  }

  if (prevBeatBtn) {
    prevBeatBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      goPrevStep();
    });
  }

  if (nextBeatBtn) {
    nextBeatBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      const step = getStepById(currentStepId);
      if (!step) return;
      if (isTyping) {
        finishTypingImmediately(step);
      } else {
        Sound.tap();
        goNextStep();
      }
    });
  }

  if (autoToggleBtn) {
    autoToggleBtn.addEventListener('click', function () {
      isAutoPlay = !isAutoPlay;
      Sound.tap();
      autoToggleBtn.classList.toggle('active', isAutoPlay);
      autoToggleBtn.setAttribute('aria-pressed', String(isAutoPlay));
      autoToggleBtn.textContent = isAutoPlay ? '자동 ON' : '자동 OFF';

      const step = getStepById(currentStepId);
      if (step && step.type === 'dialogue') {
        if (tapHintText) {
          tapHintText.textContent = isAutoPlay
            ? '자동 진행 중 · 터치하면 바로 넘어갑니다'
            : '화면을 터치하면 다음 장면으로 이동';
        }
        if (!isTyping) {
          startHoldTimer(step);
        }
      }
    });
  }

  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', function () {
      isSoundEnabled = !isSoundEnabled;
      soundToggleBtn.setAttribute('aria-pressed', String(isSoundEnabled));
      if (soundOnIcon) soundOnIcon.style.display = isSoundEnabled ? 'block' : 'none';
      if (soundOffIcon) soundOffIcon.style.display = isSoundEnabled ? 'none' : 'block';
      if (isSoundEnabled) {
        initAudio();
        Sound.tap();
        startBgm();
        if (isTyping) startSubtitleSfx();
      } else {
        pauseBgm(false);
        stopSubtitleSfx();
      }
    });
  }

  function resetAllEducation() {
    clearTimers();
    pauseBgm(true);
    stopSubtitleSfx();
    clearChoice1Selection();
    resetQuiz();
    resetPuzzle();
    resetFeedbackSection();
    historyStack.length = 0;
    currentStepId = '4-1-1';
    lastFloor = '07F';
    isStarted = false;
    isEnded = false;
    hideAllSheets();
    if (submitCompleteModal) submitCompleteModal.classList.remove('active');
    if (endOverlay) endOverlay.classList.remove('active');
    if (hudTop) hudTop.style.display = '';
    if (dialogueOverlay) dialogueOverlay.classList.remove('active');
    if (tapCatcher) tapCatcher.style.display = 'none';
    if (startOverlay) startOverlay.classList.add('active');
    setStageGif(STORY_STEPS[0].gif);
    if (chapterBadge) chapterBadge.textContent = '1/5 도입';
    if (floorBadge) {
      floorBadge.textContent = '07F';
      floorBadge.classList.remove('arrived');
    }
    initSegments();
  }

  if (restartBtn) {
    restartBtn.addEventListener('click', function () {
      Sound.tap();
      resetAllEducation();
    });
  }

  // ==========================================
  // 7. Choice #1 (Real Branching Scenario)
  // ==========================================
  const choice1Options = document.getElementById('choice1Options');
  const choice1BackBtn = document.getElementById('choice1BackBtn');
  const safeResultBackBtn = document.getElementById('safeResultBackBtn');
  const watchRiskBranchBtn = document.getElementById('watchRiskBranchBtn');
  const skipToQuizBtn = document.getElementById('skipToQuizBtn');

  function clearChoice1Selection() {
    selectedChoice1 = null;
    if (!choice1Options) return;
    choice1Options.querySelectorAll('.choice-row').forEach((row) => {
      row.classList.remove('selected');
      const goBtn = row.querySelector('.choice-go-btn');
      if (goBtn) goBtn.setAttribute('tabindex', '-1');
    });
  }

  if (choice1Options) {
    choice1Options.querySelectorAll('.choice-btn').forEach((btn) => {
      btn.addEventListener('click', function () {
        const val = this.getAttribute('data-choice');
        selectedChoice1 = val;
        Sound.tap();
        choice1Options.querySelectorAll('.choice-row').forEach((row) => {
          const isTarget = row.getAttribute('data-choice') === val;
          row.classList.toggle('selected', isTarget);
          const goBtn = row.querySelector('.choice-go-btn');
          if (goBtn) goBtn.setAttribute('tabindex', isTarget ? '0' : '-1');
        });
      });
    });

    choice1Options.querySelectorAll('.choice-go-btn').forEach((goBtn) => {
      goBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const val = this.getAttribute('data-choice');
        if (!val || val !== selectedChoice1) return;
        Sound.confirm();
        if (val === 'pause') {
          navigateTo('safe-1', true);
        } else {
          navigateTo('4-2-1', true);
        }
      });
    });
  }

  if (choice1BackBtn) choice1BackBtn.addEventListener('click', goPrevStep);
  if (safeResultBackBtn) safeResultBackBtn.addEventListener('click', goPrevStep);
  if (watchRiskBranchBtn) {
    watchRiskBranchBtn.addEventListener('click', function () {
      Sound.tap();
      navigateTo('4-2-1', true);
    });
  }
  if (skipToQuizBtn) {
    skipToQuizBtn.addEventListener('click', function () {
      Sound.tap();
      navigateTo('4-3-intro', true);
    });
  }

  // ==========================================
  // 8. Start Department Select & Scene 4-3 Core Quiz
  // ==========================================
  const deptSelect = document.getElementById('deptSelect');
  const deptLoadStatus = document.getElementById('deptLoadStatus');
  const retryDeptBtn = document.getElementById('retryDeptBtn');
  const quizDeptPill = document.getElementById('quizDeptPill');
  const quizAlreadyDoneBox = document.getElementById('quizAlreadyDoneBox');
  const quizAlreadyDoneText = document.getElementById('quizAlreadyDoneText');
  const quizContinueBtn = document.getElementById('quizContinueBtn');
  const quizSubmitBtn = document.getElementById('quizSubmitBtn');
  const quizStatusText = document.getElementById('quizStatusText');
  const quizBackBtn = document.getElementById('quizBackBtn');

  function populateDepartments(list) {
    if (!deptSelect) return;
    const prev = deptSelect.value;
    deptSelect.innerHTML = '<option value="">-- 소속 부서를 선택해 주세요 --</option>';
    (list || []).forEach((dept) => {
      const opt = document.createElement('option');
      opt.value = dept;
      opt.textContent = dept;
      deptSelect.appendChild(opt);
    });
    deptSelect.disabled = false;
    if (prev && list.indexOf(prev) !== -1) {
      deptSelect.value = prev;
    }
    selectedDepartment = deptSelect.value.trim();
    if (startEduBtn) {
      startEduBtn.disabled = !selectedDepartment;
    }
    if (deptLoadStatus) {
      deptLoadStatus.textContent = '';
    }
    if (retryDeptBtn) {
      retryDeptBtn.style.display = 'none';
    }
  }

  async function loadDepartmentsFromSheet() {
    if (deptSelect) {
      deptSelect.disabled = true;
      deptSelect.innerHTML = '<option value="">-- 부서 목록을 불러오는 중... --</option>';
    }
    if (startEduBtn) startEduBtn.disabled = true;
    if (retryDeptBtn) retryDeptBtn.style.display = 'none';
    if (deptLoadStatus) deptLoadStatus.textContent = '구글 시트에서 부서 목록을 불러오는 중입니다.';

    const MAX_ATTEMPTS = 3;
    const RETRY_DELAYS = [600, 1400];
    let lastErr = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const depts = await apiLoadDepartments();
        populateDepartments(depts);
        return;
      } catch (err) {
        lastErr = err;
        if (window.location.protocol === 'file:') {
          break;
        }
        if (attempt < MAX_ATTEMPTS) {
          if (deptLoadStatus) {
            deptLoadStatus.textContent = `부서 목록을 다시 불러오는 중입니다. (${attempt + 1}/${MAX_ATTEMPTS})`;
          }
          await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt - 1] || 1000));
        }
      }
    }

    if (deptSelect) {
      deptSelect.disabled = true;
      deptSelect.innerHTML = '<option value="">-- 부서 목록을 불러오지 못했습니다 --</option>';
    }
    if (startEduBtn) startEduBtn.disabled = true;
    if (deptLoadStatus) {
      deptLoadStatus.textContent = formatApiError(
        lastErr,
        "구글 시트 '부서' 목록을 불러오지 못했습니다."
      );
    }
    if (retryDeptBtn) retryDeptBtn.style.display = 'block';
  }

  if (retryDeptBtn) {
    retryDeptBtn.addEventListener('click', function () {
      Sound.tap();
      loadDepartmentsFromSheet();
    });
  }

  function updateQuizSubmitState() {
    const ready = !!(selectedQuizOption && selectedDepartment && !isSubmittingQuiz && !submittedAnswer);
    if (quizSubmitBtn) {
      quizSubmitBtn.disabled = !ready;
    }
  }

  function renderQuizPanel() {
    if (quizDeptPill) {
      quizDeptPill.textContent = selectedDepartment || '';
    }
    if (submittedAnswer) {
      document.querySelectorAll('.option-btn').forEach((btn) => {
        btn.classList.toggle('selected', btn.getAttribute('data-key') === submittedAnswer);
        btn.disabled = true;
      });
      if (quizSubmitBtn) quizSubmitBtn.style.display = 'none';
      if (quizAlreadyDoneBox) quizAlreadyDoneBox.style.display = 'block';
      if (quizAlreadyDoneText) {
        quizAlreadyDoneText.textContent = `이미 답변이 제출되었습니다 (선택한 답: ${submittedAnswer}).`;
      }
      return;
    }

    document.querySelectorAll('.option-btn').forEach((btn) => {
      btn.disabled = false;
      btn.classList.toggle('selected', btn.getAttribute('data-key') === selectedQuizOption);
    });
    if (quizAlreadyDoneBox) quizAlreadyDoneBox.style.display = 'none';
    if (quizSubmitBtn) {
      quizSubmitBtn.style.display = 'inline-flex';
      quizSubmitBtn.textContent = '선택 제출하고 다음으로';
    }
    updateQuizSubmitState();
  }

  function resetQuiz() {
    selectedQuizOption = null;
    submittedAnswer = null;
    selectedDepartment = '';
    latestDeptStats = null;
    isSubmittingQuiz = false;
    document.querySelectorAll('.option-btn').forEach((btn) => {
      btn.disabled = false;
      btn.classList.remove('selected');
    });
    if (deptSelect) deptSelect.value = '';
    if (startEduBtn) startEduBtn.disabled = true;
    if (quizDeptPill) quizDeptPill.textContent = '';
    if (quizAlreadyDoneBox) quizAlreadyDoneBox.style.display = 'none';
    if (quizStatusText) quizStatusText.textContent = '';
    if (quizSubmitBtn) {
      quizSubmitBtn.style.display = 'inline-flex';
      quizSubmitBtn.textContent = '선택 제출하고 다음으로';
    }
    updateQuizSubmitState();
  }

  if (deptSelect) {
    deptSelect.addEventListener('change', function () {
      selectedDepartment = deptSelect.value.trim();
      if (startEduBtn) {
        startEduBtn.disabled = !selectedDepartment;
      }
      if (selectedDepartment) {
        Sound.tap();
      }
    });
  }

  document.querySelectorAll('.option-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      if (isSubmittingQuiz || submittedAnswer) return;
      Sound.tap();
      selectedQuizOption = this.getAttribute('data-key');
      document.querySelectorAll('.option-btn').forEach((b) => {
        b.classList.remove('selected');
      });
      this.classList.add('selected');
      if (quizStatusText) quizStatusText.textContent = '';
      updateQuizSubmitState();
    });
  });

  if (quizContinueBtn) {
    quizContinueBtn.addEventListener('click', function () {
      Sound.tap();
      navigateTo('4-4-intro', true);
    });
  }

  async function submitQuizWithRetry(dept, ans, uuid, retryCount) {
    const MAX_RETRIES = 3;
    try {
      return await apiSubmitQuiz(dept, ans, uuid);
    } catch (err) {
      if (retryCount < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 700 * (retryCount + 1)));
        return submitQuizWithRetry(dept, ans, uuid, retryCount + 1);
      }
      throw err;
    }
  }

  if (quizSubmitBtn) {
    quizSubmitBtn.addEventListener('click', async function () {
      if (!selectedQuizOption || !selectedDepartment || isSubmittingQuiz || submittedAnswer) return;

      isSubmittingQuiz = true;
      updateQuizSubmitState();
      quizSubmitBtn.textContent = '제출 중...';
      if (quizStatusText) quizStatusText.textContent = '응답을 기록하고 있습니다.';

      const uuid = generateAnonymousUuid();
      try {
        const stats = await submitQuizWithRetry(selectedDepartment, selectedQuizOption, uuid, 0);
        submittedAnswer = selectedQuizOption;
        latestDeptStats = stats || null;
        Sound.snap();
        if (quizStatusText) quizStatusText.textContent = '';
        isSubmittingQuiz = false;
        navigateTo('4-4-intro', true);
      } catch (err) {
        isSubmittingQuiz = false;
        quizSubmitBtn.textContent = '선택 제출하고 다음으로';
        updateQuizSubmitState();
        if (quizStatusText) {
          quizStatusText.textContent = formatApiError(
            err,
            '제출 중 오류가 발생했습니다. 다시 시도해 주세요.'
          );
        }
      }
    });
  }

  if (quizBackBtn) {
    quizBackBtn.addEventListener('click', goPrevStep);
  }

  // ==========================================
  // 9. Scene 4-4: 12-Patient Elimination Board & Inline Caution Places
  // ==========================================
  // 4단계 순차 축소: room(5명) -> date(3명) -> guardian(2명) -> test(1명, 환자6 홍OO 특정)
  const COHORT_PATIENTS = [
    { id: 1, room: false, date: true, guardian: true, test: false },
    { id: 2, room: false, date: true, guardian: false, test: true },
    { id: 3, room: true, date: false, guardian: true, test: false },
    { id: 4, room: false, date: false, guardian: true, test: true },
    { id: 5, room: false, date: false, guardian: false, test: false },
    { id: 6, room: true, date: true, guardian: true, test: true, isTarget: true },
    { id: 7, room: false, date: true, guardian: false, test: false },
    { id: 8, room: false, date: false, guardian: true, test: false },
    { id: 9, room: true, date: true, guardian: false, test: true },
    { id: 10, room: true, date: true, guardian: true, test: false },
    { id: 11, room: true, date: false, guardian: false, test: true },
    { id: 12, room: false, date: false, guardian: false, test: true }
  ];

  const PIECE_LABELS = {
    room: '701호',
    date: '어제 입원',
    guardian: '모녀 동행',
    test: 'CT 이상 소견'
  };

  const connectedPieces = [];
  const patientCohortGrid = document.getElementById('patientCohortGrid');
  const cohortCountBadge = document.getElementById('cohortCountBadge');
  const identityCard = document.getElementById('identityCard');
  const identityTag = document.getElementById('identityTag');
  const assembledClues = document.getElementById('assembledClues');
  const identityStatus = document.getElementById('identityStatus');
  const toPlacesBtn = document.getElementById('toPlacesBtn');
  const puzzleBackBtn = document.getElementById('puzzleBackBtn');
  const placesBackBtn = document.getElementById('placesBackBtn');
  const toSummaryBtn = document.getElementById('toSummaryBtn');

  function initCohortGrid() {
    if (!patientCohortGrid) return;
    patientCohortGrid.innerHTML = '';
    COHORT_PATIENTS.forEach((pt, idx) => {
      const div = document.createElement('div');
      div.className = 'cohort-person';
      div.setAttribute('data-patient-id', String(pt.id));
      div.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span class="cohort-person-label">환자 ${idx + 1}</span>
      `;
      patientCohortGrid.appendChild(div);
    });
  }

  function updateSimulatorUI(silent) {
    const activeClues = connectedPieces.slice();
    let remaining = 0;

    COHORT_PATIENTS.forEach((pt, idx) => {
      const el = patientCohortGrid
        ? patientCohortGrid.querySelector(`[data-patient-id="${pt.id}"]`)
        : null;
      const matches = activeClues.every((key) => pt[key] === true);
      if (matches) remaining += 1;

      if (el) {
        el.classList.toggle('eliminated', !matches);
        const label = el.querySelector('.cohort-person-label');
        el.classList.toggle('identified', false);
        if (label) {
          label.textContent = `환자 ${idx + 1}`;
        }
      }
    });

    const isIdentified = remaining === 1 && activeClues.length > 0;
    if (isIdentified && patientCohortGrid) {
      const targetEl = patientCohortGrid.querySelector('[data-patient-id="6"]');
      if (targetEl) {
        targetEl.classList.add('identified');
        const label = targetEl.querySelector('.cohort-person-label');
        if (label) label.textContent = '홍OO 특정';
      }
    }

    if (cohortCountBadge) {
      cohortCountBadge.textContent = isIdentified ? '1명 특정 (홍OO)' : `후보 ${remaining}명`;
      cohortCountBadge.classList.toggle('is-identified', isIdentified);
    }

    if (identityTag) {
      identityTag.textContent = isIdentified ? '신원 특정' : `${remaining}명 남음`;
    }

    if (assembledClues) {
      assembledClues.innerHTML = activeClues
        .map((key) => `<span class="clue-chip">${PIECE_LABELS[key] || key}</span>`)
        .join('');
    }

    if (identityStatus) {
      if (activeClues.length === 0) {
        identityStatus.textContent = '대화 속 단서들이 순서대로 연결되며 환자가 좁혀집니다.';
      } else if (isIdentified) {
        identityStatus.textContent =
          '이름을 말하지 않았는데도 선택된 단서들이 결합되어 홍OO 환자 1명으로 특정되었습니다.';
      } else {
        identityStatus.textContent =
          `조건과 일치하는 후보가 12명에서 ${remaining}명으로 좁혀졌습니다.`;
      }
    }

    if (identityCard) {
      identityCard.classList.toggle('alert-active', isIdentified);
    }

    if (!silent) {
      if (isIdentified) {
        Sound.dangerAlert();
      } else {
        Sound.tap();
      }
    }
  }

  let puzzleAutoTimers = [];
  const PUZZLE_AUTO_SEQUENCE = ['room', 'date', 'guardian', 'test'];

  function stopPuzzleAutoPlay() {
    puzzleAutoTimers.forEach((tid) => clearTimeout(tid));
    puzzleAutoTimers = [];
  }

  function resetPuzzle() {
    stopPuzzleAutoPlay();
    connectedPieces.length = 0;
    document.querySelectorAll('.puzzle-card').forEach((card) => {
      card.classList.remove('connected');
    });
    updateSimulatorUI(true);
  }

  function startPuzzleAutoPlay() {
    resetPuzzle();
    PUZZLE_AUTO_SEQUENCE.forEach((piece, idx) => {
      const tid = setTimeout(() => {
        if (currentStepId !== '4-4-1') return;
        const card = document.querySelector(`.puzzle-card[data-piece="${piece}"]`);
        if (card) card.classList.add('connected');
        if (connectedPieces.indexOf(piece) === -1) {
          connectedPieces.push(piece);
        }
        updateSimulatorUI(false);
      }, 650 + idx * 900);
      puzzleAutoTimers.push(tid);
    });
  }

  if (puzzleBackBtn) puzzleBackBtn.addEventListener('click', goPrevStep);
  if (toPlacesBtn) {
    toPlacesBtn.addEventListener('click', function () {
      Sound.tap();
      navigateTo('4-4-2-intro', true);
    });
  }
  if (placesBackBtn) placesBackBtn.addEventListener('click', goPrevStep);
  if (toSummaryBtn) {
    toSummaryBtn.addEventListener('click', function () {
      Sound.tap();
      navigateTo('4-5', true);
    });
  }

  // ==========================================
  // 10. Scene 4-5 Answer Reveal, Dept Stats, Single-Select Poll & Private Feedback
  // ==========================================
  const submittedAnsChip = document.getElementById('submittedAnsChip');
  const compareSummaryText = document.getElementById('compareSummaryText');
  const deptStatsTitle = document.getElementById('deptStatsTitle');
  const deptStatsCount = document.getElementById('deptStatsCount');
  const deptStatsBars = document.getElementById('deptStatsBars');
  const pollActivityBlock = document.getElementById('pollActivityBlock');
  const pollOptionsGrid = document.getElementById('pollOptionsGrid');
  const wallInput = document.getElementById('wallInput');
  const feedbackStatusText = document.getElementById('feedbackStatusText');
  const submitFeedbackBtn = document.getElementById('submitFeedbackBtn');
  const feedbackDoneBanner = document.getElementById('feedbackDoneBanner');
  const summaryBackBtn = document.getElementById('summaryBackBtn');

  const OPTION_FEEDBACK_NOTES = {
    A: '환자 실명을 언급하지 않았더라도 병실 번호, 검사 결과, 보호자 정보 등이 결합되면 누구인지 알아챌 수 있습니다.',
    B: '엘리베이터나 복도는 작은 속삭임도 주변 사람에게 그대로 전달되기 쉬워 공개 장소 대화를 피해야 합니다.',
    C: '의료진 간의 정당한 업무 대화라도 제3자가 있는 공개 공간에서는 비밀유지 의무 위반 소지가 있습니다.',
    D: '공개 장소에서는 환자 관련 대화를 멈추고 장소를 옮겨야 합니다.',
    E: '탑승객 모두의 직무 관련성을 일일이 확인할 수 없으며, 타 부서 직원이라도 해당 환자 치료와 무관하다면 정보 노출에 해당합니다.'
  };

  // 1회차-APPS/Code.gs FEEDBACK_OPTIONS.SCENE04.options 와 글자 하나까지 동일
  const SCENE04_FEEDBACK_OPTIONS = [
    '엘리베이터',
    '복도',
    '직원식당',
    '카페',
    '원무·접수 대기공간',
    '탈의실·휴게실',
    '병원 밖 식당·대중교통'
  ];

  function renderSummaryView() {
    const ans = submittedAnswer || '-';
    if (submittedAnsChip) {
      submittedAnsChip.textContent = `내가 제출한 답: ${ans}`;
      submittedAnsChip.classList.remove('is-correct', 'is-wrong');
      if (ans === 'D') {
        submittedAnsChip.classList.add('is-correct');
      } else if (ans !== '-') {
        submittedAnsChip.classList.add('is-wrong');
      }
    }

    if (compareSummaryText) {
      if (ans === 'D') {
        compareSummaryText.textContent = OPTION_FEEDBACK_NOTES.D;
      } else if (OPTION_FEEDBACK_NOTES[ans]) {
        compareSummaryText.textContent =
          `선택하신 ${ans}는 주의가 필요합니다. ${OPTION_FEEDBACK_NOTES[ans]} 따라서 ${OPTION_FEEDBACK_NOTES.D}`;
      } else {
        compareSummaryText.textContent = OPTION_FEEDBACK_NOTES.D;
      }
    }

    renderDeptStats();
  }

  function renderDeptStats() {
    if (!deptStatsBars) return;
    const stats = latestDeptStats;
    if (!stats || !stats.optionCounts) {
      if (deptStatsTitle) deptStatsTitle.textContent = '소속 부서 참여 현황';
      if (deptStatsCount) deptStatsCount.textContent = '참여 대기';
      deptStatsBars.innerHTML = '';
      return;
    }

    const deptLabel = stats.targetDept || selectedDepartment || '우리 부서';
    const deptTotal = stats.deptCount || 0;
    if (deptStatsTitle) deptStatsTitle.textContent = `[${deptLabel}] 선택 현황`;
    if (deptStatsCount) deptStatsCount.textContent = `총 ${deptTotal}명 참여`;

    const keys = ['A', 'B', 'C', 'D', 'E'];
    deptStatsBars.innerHTML = keys
      .map((k) => {
        const count = stats.optionCounts[k] || 0;
        const pct = deptTotal > 0 ? Math.round((count / deptTotal) * 100) : 0;
        const isAnswer = k === 'D';
        const label = isAnswer ? 'D(정답)' : k;
        return `
          <div class="stat-bar-row">
            <span class="stat-bar-label ${isAnswer ? 'is-answer' : ''}">${label}</span>
            <div class="stat-bar-track">
              <div class="stat-bar-fill ${isAnswer ? 'is-answer' : ''}" style="width: ${pct}%;"></div>
            </div>
            <span class="stat-bar-val">${count}명</span>
          </div>
        `;
      })
      .join('');
  }

  function updateFeedbackSubmitState() {
    const canSubmit = !!(selectedFeedbackPlace && !isFeedbackSubmitted);
    if (submitFeedbackBtn) {
      submitFeedbackBtn.disabled = !canSubmit;
    }
  }

  function renderPoll() {
    if (!pollOptionsGrid) return;
    pollOptionsGrid.innerHTML = '';

    SCENE04_FEEDBACK_OPTIONS.forEach((labelText) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `poll-item ${selectedFeedbackPlace === labelText ? 'checked' : ''}`;
      btn.setAttribute('data-reason', labelText);
      btn.disabled = isFeedbackSubmitted;
      btn.innerHTML = `
        <span class="poll-radio" aria-hidden="true">
          <span class="poll-radio-dot"></span>
        </span>
        <span>${labelText}</span>
      `;
      btn.addEventListener('click', function () {
        if (isFeedbackSubmitted) return;
        Sound.tap();
        selectedFeedbackPlace = labelText;
        if (pollActivityBlock) pollActivityBlock.classList.remove('needs-attention');
        if (feedbackStatusText) feedbackStatusText.textContent = '';
        renderPoll();
      });
      pollOptionsGrid.appendChild(btn);
    });
    updateFeedbackSubmitState();
  }

  function resetFeedbackSection() {
    selectedFeedbackPlace = '';
    isFeedbackSubmitted = false;
    if (pollActivityBlock) pollActivityBlock.classList.remove('needs-attention');
    if (wallInput) {
      wallInput.value = '';
      wallInput.disabled = false;
    }
    if (feedbackStatusText) feedbackStatusText.textContent = '';
    if (submitFeedbackBtn) {
      submitFeedbackBtn.style.display = 'inline-flex';
      submitFeedbackBtn.disabled = true;
      submitFeedbackBtn.textContent = '의견 제출하기';
    }
    if (feedbackDoneBanner) feedbackDoneBanner.style.display = 'none';
    renderPoll();
  }

  function openSubmitCompleteModal() {
    if (submitCompleteModal) {
      submitCompleteModal.classList.add('active');
    }
    if (confirmEndEduBtn) {
      confirmEndEduBtn.focus();
    }
  }

  function enterEducationEndedState() {
    isEnded = true;
    clearTimers();
    pauseBgm(true);
    stopSubtitleSfx();
    hideAllSheets();
    if (submitCompleteModal) submitCompleteModal.classList.remove('active');
    if (dialogueOverlay) dialogueOverlay.classList.remove('active');
    if (tapCatcher) tapCatcher.style.display = 'none';
    if (hudTop) hudTop.style.display = 'none';
    if (endDeptMeta) {
      endDeptMeta.textContent = selectedDepartment
        ? `참여 부서: ${selectedDepartment}`
        : '개인정보보호 4회차 이수 완료';
    }
    if (endOverlay) endOverlay.classList.add('active');
  }

  if (confirmEndEduBtn) {
    confirmEndEduBtn.addEventListener('click', function () {
      Sound.confirm();
      enterEducationEndedState();
      try {
        window.close();
      } catch (ignore) {}
    });
  }

  if (submitFeedbackBtn) {
    submitFeedbackBtn.addEventListener('click', async function () {
      if (isFeedbackSubmitted) return;
      if (!selectedFeedbackPlace) {
        if (feedbackStatusText) {
          feedbackStatusText.textContent = '위 "함께 생각해 볼 질문"에서 장소를 1개 선택해 주세요.';
        }
        if (pollActivityBlock) {
          pollActivityBlock.classList.add('needs-attention');
          pollActivityBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      const dept = selectedDepartment || (deptSelect ? deptSelect.value.trim() : '');
      if (!dept) {
        if (feedbackStatusText) {
          feedbackStatusText.textContent = '소속 부서 정보가 확인되지 않았습니다. 이전 문제에서 부서를 선택해 주세요.';
        }
        return;
      }

      const idea = wallInput ? wallInput.value.trim() : '';
      submitFeedbackBtn.disabled = true;
      submitFeedbackBtn.textContent = '제출 중...';
      if (feedbackStatusText) feedbackStatusText.textContent = '';

      try {
        await apiSubmitFeedback(dept, selectedFeedbackPlace, idea);
        isFeedbackSubmitted = true;
        Sound.confirm();
        renderPoll();
        if (wallInput) wallInput.disabled = true;
        submitFeedbackBtn.style.display = 'none';
        if (feedbackDoneBanner) feedbackDoneBanner.style.display = 'block';
        openSubmitCompleteModal();
      } catch (err) {
        submitFeedbackBtn.disabled = false;
        submitFeedbackBtn.textContent = '의견 제출하기';
        if (feedbackStatusText) {
          feedbackStatusText.textContent = formatApiError(
            err,
            '제출 중 오류가 발생했습니다. 다시 시도해 주세요.'
          );
        }
      }
    });
  }

  if (summaryBackBtn) summaryBackBtn.addEventListener('click', goPrevStep);

  // ==========================================
  // 11. Initialize & Lifecycle Audio Handling
  // ==========================================
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      pauseBgm(false);
      stopSubtitleSfx();
    } else if (isSoundEnabled && isStarted && !isEnded) {
      startBgm();
      if (isTyping) startSubtitleSfx();
    }
  });

  window.addEventListener('pagehide', function () {
    pauseBgm(false);
    stopSubtitleSfx();
  });

  document.addEventListener('DOMContentLoaded', function () {
    initSegments();
    initCohortGrid();
    preloadAhead(STORY_STEPS[0]);
    updateSimulatorUI(true);
    renderPoll();
    loadDepartmentsFromSheet();

    // Prevent iOS Safari pinch/double-tap zoom gestures
    document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
  });
})();
