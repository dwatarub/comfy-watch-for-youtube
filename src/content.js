/**
 * ComfyWatch for YouTube - コンテンツスクリプト
 *
 * 機能1: 明るさ調節スライダー
 *   挿入位置：左側コントロールバーの音量エリアと再生時間表示の間
 *   UIスタイル：ホバーで展開するパネル型
 *   パネル内：-5ボタン / スライダー（100%マーカー付き） / +5ボタン / 数値ラベル
 *   アイコンクリック：明るさを100%にリセット
 *
 * 機能2: 酔い防止センタードット
 *   YouTubeプレイヤーの中央に固定点を表示する
 *   トグルボタン：明るさコントロールの右隣に独立配置・常時表示
 */

// ===== 定数 =====
const DEFAULT_BRIGHTNESS    = 100;
const BRIGHTNESS_STORAGE_KEY = 'youtubeBrightness';
const SLIDER_MIN = 10;
const SLIDER_MAX = 200;
const SLIDER_STEP = 5;

// 100%位置の割合（スライダー左端からの%）
// (100 - MIN) / (MAX - MIN) = 90 / 190 ≈ 0.4737
const MARKER_POSITION_PCT = ((DEFAULT_BRIGHTNESS - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN) * 100).toFixed(3);

// ===== SVG定義（ドットトグル） =====
const DOT_ON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
  <path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7z"
        fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="12" cy="12" r="3" fill="#fff"/>
</svg>`;
const DOT_OFF_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
  <path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7z"
        fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="12" cy="12" r="3" fill="rgba(255,255,255,0.35)"/>
  <line x1="4" y1="4" x2="20" y2="20" stroke="rgba(255,255,255,0.35)" stroke-width="2" stroke-linecap="round"/>
</svg>`;

// ===== センタードット：グローバル変数 =====
/** @type {HTMLElement|null} */
let centerDot = null;
/** @type {HTMLElement|null} */
let ytPlayer = null;
let dotConfig = {
  dotSize: 8,
  dotColor: '#ffffff',
  isDotVisible: true
};

// =============================================================
// 機能1: 明るさ調節スライダー
// =============================================================

/**
 * 明るさコントロールとドットトグルをコントロールバーに挿入する
 */
function insertBrightnessSlider() {
  if (document.getElementById('yt-brightness-control')) return;

  const volumeArea = document.querySelector('.ytp-volume-area');
  if (!volumeArea) return;

  // ===== 明るさコントロール本体 =====
  const controlWrapper = document.createElement('div');
  controlWrapper.id = 'yt-brightness-control';
  controlWrapper.className = 'yt-brightness-control ytp-volume-area';

  // 太陽アイコンボタン（クリックで100%リセット）
  const iconButton = document.createElement('button');
  iconButton.className = 'yt-brightness-icon-btn ytp-button';
  iconButton.title = 'クリックで明るさを100%にリセット';
  iconButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" fill="#ffffff">
      <circle cx="12" cy="12" r="4"/>
      <line x1="12" y1="2"  x2="12" y2="5"  stroke="#fff" stroke-width="2" stroke-linecap="round"/>
      <line x1="12" y1="19" x2="12" y2="22" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
      <line x1="2"  y1="12" x2="5"  y2="12" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
      <line x1="19" y1="12" x2="22" y2="12" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
      <line x1="4.22"  y1="4.22"  x2="6.34"  y2="6.34"  stroke="#fff" stroke-width="2" stroke-linecap="round"/>
      <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
      <line x1="19.78" y1="4.22"  x2="17.66" y2="6.34"  stroke="#fff" stroke-width="2" stroke-linecap="round"/>
      <line x1="6.34"  y1="17.66" x2="4.22"  y2="19.78" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
    </svg>`;

  // ===== スライダーパネル（ホバーで展開） =====
  const sliderPanel = document.createElement('div');
  sliderPanel.className = 'yt-brightness-panel';

  // -5ボタン
  const decreaseBtn = document.createElement('button');
  decreaseBtn.className = 'yt-brightness-step-btn ytp-button';
  decreaseBtn.title = '-5%';
  decreaseBtn.textContent = '−';

  // スライダーラッパー（100%マーカー縦線を重ねるためrelative配置）
  const sliderWrapper = document.createElement('div');
  sliderWrapper.className = 'yt-brightness-slider-wrapper';
  // CSS変数でマーカー位置を渡す
  sliderWrapper.style.setProperty('--marker-pct', `${MARKER_POSITION_PCT}%`);

  // スライダー本体
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.id = 'yt-brightness-slider';
  slider.className = 'yt-brightness-slider';
  slider.min = String(SLIDER_MIN);
  slider.max = String(SLIDER_MAX);
  slider.step = String(SLIDER_STEP);
  slider.value = String(DEFAULT_BRIGHTNESS);
  slider.title = '明るさ';

  sliderWrapper.appendChild(slider);

  // +5ボタン
  const increaseBtn = document.createElement('button');
  increaseBtn.className = 'yt-brightness-step-btn ytp-button';
  increaseBtn.title = '+5%';
  increaseBtn.textContent = '＋';

  // 数値ラベル
  const valueLabel = document.createElement('span');
  valueLabel.id = 'yt-brightness-value';
  valueLabel.className = 'yt-brightness-value';
  valueLabel.textContent = `${DEFAULT_BRIGHTNESS}%`;

  sliderPanel.appendChild(decreaseBtn);
  sliderPanel.appendChild(sliderWrapper);
  sliderPanel.appendChild(increaseBtn);
  sliderPanel.appendChild(valueLabel);

  controlWrapper.appendChild(iconButton);
  controlWrapper.appendChild(sliderPanel);

  // ===== ドットトグルボタン（独立・常時表示） =====
  const dotToggleWrapper = document.createElement('div');
  dotToggleWrapper.id = 'cw-dot-toggle-control';
  dotToggleWrapper.className = 'cw-dot-toggle-control';

  const dotToggleBtn = document.createElement('button');
  dotToggleBtn.id = 'cw-dot-toggle-btn';
  dotToggleBtn.className = 'cw-dot-toggle-btn ytp-button';
  dotToggleBtn.title = 'センタードット ON/OFF';
  dotToggleBtn.innerHTML = dotConfig.isDotVisible ? DOT_ON_SVG : DOT_OFF_SVG;

  dotToggleWrapper.appendChild(dotToggleBtn);

  // 明るさコントロールを挿入し、その直後にドットトグルを配置する
  volumeArea.insertAdjacentElement('afterend', dotToggleWrapper);
  volumeArea.insertAdjacentElement('afterend', controlWrapper);

  // ===== 初期値の読み込み =====
  loadAndApplyBrightness(slider, valueLabel);

  chrome.storage.sync.get({ isDotVisible: true }, (result) => {
    dotConfig.isDotVisible = result.isDotVisible;
    dotToggleBtn.innerHTML = dotConfig.isDotVisible ? DOT_ON_SVG : DOT_OFF_SVG;
    createOrUpdateDot();
  });

  // ===== イベントリスナー =====

  // 太陽アイコン：100%リセット
  iconButton.addEventListener('click', () => {
    updateBrightness(slider, valueLabel, DEFAULT_BRIGHTNESS);
  });

  // -5ボタン
  decreaseBtn.addEventListener('click', () => {
    const newValue = Math.max(SLIDER_MIN, parseInt(slider.value) - SLIDER_STEP);
    updateBrightness(slider, valueLabel, newValue);
  });

  // +5ボタン
  increaseBtn.addEventListener('click', () => {
    const newValue = Math.min(SLIDER_MAX, parseInt(slider.value) + SLIDER_STEP);
    updateBrightness(slider, valueLabel, newValue);
  });

  // スライダードラッグ
  slider.addEventListener('input', () => {
    const brightnessValue = parseInt(slider.value);
    applyBrightness(brightnessValue);
    valueLabel.textContent = `${brightnessValue}%`;
    saveBrightness(brightnessValue);
  });

  // マウスホイール
  slider.addEventListener('wheel', (event) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -SLIDER_STEP : SLIDER_STEP;
    const newValue = Math.min(SLIDER_MAX, Math.max(SLIDER_MIN, parseInt(slider.value) + delta));
    updateBrightness(slider, valueLabel, newValue);
  });

  // ドットトグル
  dotToggleBtn.addEventListener('click', () => {
    dotConfig.isDotVisible = !dotConfig.isDotVisible;
    dotToggleBtn.innerHTML = dotConfig.isDotVisible ? DOT_ON_SVG : DOT_OFF_SVG;
    createOrUpdateDot();
    chrome.storage.sync.set({ isDotVisible: dotConfig.isDotVisible });
  });

  // キーボードショートカット干渉防止
  controlWrapper.addEventListener('keydown', (e) => e.stopPropagation());
  dotToggleWrapper.addEventListener('keydown', (e) => e.stopPropagation());
}

/**
 * 明るさ値を一括更新する（スライダー・ラベル・フィルター・ストレージ）
 * @param {HTMLInputElement} slider
 * @param {HTMLSpanElement} valueLabel
 * @param {number} newValue
 */
function updateBrightness(slider, valueLabel, newValue) {
  slider.value = newValue;
  applyBrightness(newValue);
  valueLabel.textContent = `${newValue}%`;
  saveBrightness(newValue);
}

/**
 * 動画プレイヤーに明るさフィルターを適用する
 * @param {number} brightnessValue
 */
function applyBrightness(brightnessValue) {
  const video = document.querySelector('video.html5-main-video');
  if (video) video.style.filter = `brightness(${brightnessValue}%)`;
}

/**
 * ストレージから明るさ設定を読み込んで適用する
 */
function loadAndApplyBrightness(slider, valueLabel) {
  chrome.storage.local.get([BRIGHTNESS_STORAGE_KEY], (result) => {
    const savedValue = result[BRIGHTNESS_STORAGE_KEY] ?? DEFAULT_BRIGHTNESS;
    slider.value = savedValue;
    valueLabel.textContent = `${savedValue}%`;
    applyBrightness(savedValue);
  });
}

/**
 * 明るさの設定値をストレージに保存する
 */
function saveBrightness(brightnessValue) {
  chrome.storage.local.set({ [BRIGHTNESS_STORAGE_KEY]: brightnessValue });
}

// =============================================================
// 機能2: 酔い防止センタードット
// =============================================================

/**
 * センタードットを作成または更新する
 */
function createOrUpdateDot() {
  if (!ytPlayer) return;

  if (!centerDot) {
    centerDot = document.createElement('div');
    centerDot.id = 'cw-center-dot';
    ytPlayer.appendChild(centerDot);
  }

  centerDot.style.display = dotConfig.isDotVisible ? 'block' : 'none';

  Object.assign(centerDot.style, {
    position:        'absolute',
    top:             '50%',
    left:            '50%',
    transform:       'translate(-50%, -50%)',
    width:           `${dotConfig.dotSize}px`,
    height:          `${dotConfig.dotSize}px`,
    backgroundColor: `${dotConfig.dotColor}B3`,
    borderRadius:    '50%',
    pointerEvents:   'none',
    zIndex:          '9999'
  });
}

/**
 * ストレージからドット設定を読み込んで初期化する
 */
function loadDotConfigAndInit() {
  chrome.storage.sync.get(['dotSize', 'dotColor', 'isDotVisible'], (result) => {
    dotConfig.dotSize      = result.dotSize      !== undefined ? result.dotSize      : 8;
    dotConfig.dotColor     = result.dotColor     !== undefined ? result.dotColor     : '#ffffff';
    dotConfig.isDotVisible = result.isDotVisible !== undefined ? result.isDotVisible : true;
    createOrUpdateDot();
  });
}

// ストレージ変更をリアルタイム反映する
chrome.storage.onChanged.addListener((changes) => {
  let needsUpdate = false;
  for (const [key, { newValue }] of Object.entries(changes)) {
    if (key === 'dotSize' || key === 'dotColor' || key === 'isDotVisible') {
      dotConfig[key] = newValue;
      needsUpdate = true;
    }
  }
  if (needsUpdate) {
    createOrUpdateDot();
    // オプションページ等の外部からisDotVisibleが変更された場合もボタンに反映する
    if (changes.isDotVisible) {
      const btn = document.getElementById('cw-dot-toggle-btn');
      if (btn) btn.innerHTML = changes.isDotVisible.newValue ? DOT_ON_SVG : DOT_OFF_SVG;
    }
  }
});

// =============================================================
// 共通：YouTube SPAのページ遷移に対応する
// =============================================================

const pageObserver = new MutationObserver(() => {
  const currentPlayer = document.querySelector('.html5-video-player');

  if (currentPlayer) {
    insertBrightnessSlider();

    const slider = document.getElementById('yt-brightness-slider');
    if (slider) applyBrightness(parseInt(slider.value));

    if (currentPlayer !== ytPlayer) {
      ytPlayer = currentPlayer;
      centerDot = null;
      loadDotConfigAndInit();
    }
  } else {
    ytPlayer  = null;
    centerDot = null;
  }
});

pageObserver.observe(document.body, { childList: true, subtree: true });

// 初期化
insertBrightnessSlider();
const initialPlayer = document.querySelector('.html5-video-player');
if (initialPlayer) {
  ytPlayer = initialPlayer;
  loadDotConfigAndInit();
}
