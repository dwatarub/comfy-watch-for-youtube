/**
 * ComfyWatch for YouTube - コンテンツスクリプト
 *
 * 機能1: 明るさ調節スライダー
 *   挿入位置：左側コントロールバーの音量エリア(.ytp-volume-area)と
 *             再生時間表示(.ytp-time-display)の間
 *   UIスタイル：音量コントロールと同様のホバー展開パネル型
 *   アイコンクリック：明るさを100%にリセット（音量ミュート切り替えと同じ挙動）
 *
 * 機能2: 酔い防止センタードット
 *   YouTubeプレイヤーの中央に固定点を表示する
 *   ポップアップで表示/非表示を切り替え、オプションページでサイズ・色を変更できる
 */

// ===== 明るさ調節：定数 =====

// デフォルトの明るさ（100% = 変化なし）
const DEFAULT_BRIGHTNESS = 100;
// 明るさのストレージキー名
const BRIGHTNESS_STORAGE_KEY = 'youtubeBrightness';

// ===== センタードット：グローバル変数 =====

/** @type {HTMLElement|null} ドット要素 */
let centerDot = null;
/** @type {HTMLElement|null} YouTubeプレイヤー要素 */
let ytPlayer = null;
/** ドットの設定値 */
let dotConfig = {
  dotSize: 8,
  dotColor: '#ffffff',
  isDotVisible: true
};

// =============================================================
// 機能1: 明るさ調節スライダー
// =============================================================

/**
 * 明るさコントロールのUIをコントロールバーに挿入する
 * 音量エリアの直後（再生時間の直前）に配置する
 */
function insertBrightnessSlider() {
  // すでにコントロールが存在する場合はスキップする
  if (document.getElementById('yt-brightness-control')) return;

  // 音量エリアを基準点として取得する
  const volumeArea = document.querySelector('.ytp-volume-area');
  if (!volumeArea) return;

  // ===== 外側ラッパー（.ytp-volume-area と同等の構造） =====
  const controlWrapper = document.createElement('div');
  controlWrapper.id = 'yt-brightness-control';
  controlWrapper.className = 'yt-brightness-control ytp-volume-area';

  // ===== アイコンボタン部分（.ytp-mute-button 相当） =====
  // クリックで明るさを100%にリセットする（音量ミュート切り替えと同じ挙動）
  const iconButton = document.createElement('button');
  iconButton.className = 'yt-brightness-icon-btn ytp-button';
  iconButton.title = 'クリックで明るさを100%にリセット';
  iconButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
         width="100%" height="100%" fill="#ffffff">
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

  // ===== スライダーパネル部分（.ytp-volume-slider-container 相当） =====
  const sliderPanel = document.createElement('div');
  sliderPanel.className = 'yt-brightness-panel';

  // スライダー入力要素を作成する
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.id = 'yt-brightness-slider';
  slider.className = 'yt-brightness-slider';
  slider.min = '10';   // 最小10%（真っ暗にはしない）
  slider.max = '200';  // 最大200%（2倍の明るさ）
  slider.step = '5';
  slider.value = DEFAULT_BRIGHTNESS;
  slider.title = '明るさ';

  // 現在値を表示するラベルを作成する
  const valueLabel = document.createElement('span');
  valueLabel.id = 'yt-brightness-value';
  valueLabel.className = 'yt-brightness-value';
  valueLabel.textContent = `${DEFAULT_BRIGHTNESS}%`;

  // ドットON/OFFトグルボタンを作成する（目のアイコン）
  const dotToggleBtn = document.createElement('button');
  dotToggleBtn.id = 'cw-dot-toggle-btn';
  dotToggleBtn.className = 'cw-dot-toggle-btn ytp-button';
  dotToggleBtn.title = 'センタードット ON/OFF';
  // 「目」SVGアイコン（ONとOFF状態でsvgを差し替える）
  const DOT_ON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
    <path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7z"
          fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="12" cy="12" r="3" fill="#fff"/>
  </svg>`;
  const DOT_OFF_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
    <path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7z"
          fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="12" cy="12" r="3" fill="rgba(255,255,255,0.4)"/>
    <line x1="4" y1="4" x2="20" y2="20" stroke="rgba(255,255,255,0.4)" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
  dotToggleBtn.innerHTML = dotConfig.isDotVisible ? DOT_ON_SVG : DOT_OFF_SVG;

  // パネル内に要素を追加する（スライダー → 数値 → ドットトグル）
  sliderPanel.appendChild(slider);
  sliderPanel.appendChild(valueLabel);
  sliderPanel.appendChild(dotToggleBtn);

  // ラッパーにアイコンとパネルを追加する
  controlWrapper.appendChild(iconButton);
  controlWrapper.appendChild(sliderPanel);

  // 音量エリアの直後（再生時間の直前）に挿入する
  volumeArea.insertAdjacentElement('afterend', controlWrapper);

  // 保存済みの明るさ設定を読み込んで適用する
  loadAndApplyBrightness(slider, valueLabel);

  // ドットトグルボタンの状態をストレージから読み込んで反映する
  chrome.storage.sync.get({ isDotVisible: true }, (result) => {
    dotConfig.isDotVisible = result.isDotVisible;
    dotToggleBtn.innerHTML = dotConfig.isDotVisible ? DOT_ON_SVG : DOT_OFF_SVG;
    dotToggleBtn.dataset.dotOn = dotConfig.isDotVisible ? 'true' : 'false';
    createOrUpdateDot();
  });

  // ドットトグルボタンクリック時：ON/OFFをトグルする
  dotToggleBtn.addEventListener('click', () => {
    dotConfig.isDotVisible = !dotConfig.isDotVisible;
    dotToggleBtn.innerHTML = dotConfig.isDotVisible ? DOT_ON_SVG : DOT_OFF_SVG;
    dotToggleBtn.dataset.dotOn = dotConfig.isDotVisible ? 'true' : 'false';
    createOrUpdateDot();
    chrome.storage.sync.set({ isDotVisible: dotConfig.isDotVisible });
  });

  // アイコンクリック時：明るさを100%にリセットする
  iconButton.addEventListener('click', () => {
    slider.value = DEFAULT_BRIGHTNESS;
    applyBrightness(DEFAULT_BRIGHTNESS);
    valueLabel.textContent = `${DEFAULT_BRIGHTNESS}%`;
    saveBrightness(DEFAULT_BRIGHTNESS);
  });

  // スライダー操作時のイベントリスナーを登録する
  slider.addEventListener('input', () => {
    const brightnessValue = parseInt(slider.value);
    applyBrightness(brightnessValue);
    valueLabel.textContent = `${brightnessValue}%`;
    saveBrightness(brightnessValue);
  });

  // コントロール上でのキー操作がYouTubeのショートカットに干渉しないようにする
  controlWrapper.addEventListener('keydown', (event) => {
    event.stopPropagation();
  });

  // マウスホイールでも明るさを調整できるようにする
  slider.addEventListener('wheel', (event) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -5 : 5;
    const newValue = Math.min(200, Math.max(10, parseInt(slider.value) + delta));
    slider.value = newValue;
    applyBrightness(newValue);
    valueLabel.textContent = `${newValue}%`;
    saveBrightness(newValue);
  });
}

/**
 * 動画プレイヤーに明るさフィルターを適用する
 * @param {number} brightnessValue - 明るさの値（10〜200）
 */
function applyBrightness(brightnessValue) {
  const video = document.querySelector('video.html5-main-video');
  if (video) {
    video.style.filter = `brightness(${brightnessValue}%)`;
  }
}

/**
 * ストレージから明るさ設定を読み込んで適用する
 * @param {HTMLInputElement} slider - スライダー要素
 * @param {HTMLSpanElement} valueLabel - 値表示ラベル
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
 * @param {number} brightnessValue - 保存する明るさの値
 */
function saveBrightness(brightnessValue) {
  chrome.storage.local.set({ [BRIGHTNESS_STORAGE_KEY]: brightnessValue });
}

// =============================================================
// 機能2: 酔い防止センタードット
// =============================================================

/**
 * センタードットを作成または更新する
 * ストレージの設定値をdotConfigに反映して表示に適用する
 */
function createOrUpdateDot() {
  if (!ytPlayer) return;

  // ドット要素がなければ新規作成する
  if (!centerDot) {
    centerDot = document.createElement('div');
    centerDot.id = 'cw-center-dot';
    ytPlayer.appendChild(centerDot);
  }

  // 表示/非表示を切り替える
  centerDot.style.display = dotConfig.isDotVisible ? 'block' : 'none';

  // スタイルを適用する（透明度を少し下げて自然に見せる）
  Object.assign(centerDot.style, {
    position:        'absolute',
    top:             '50%',
    left:            '50%',
    transform:       'translate(-50%, -50%)',
    width:           `${dotConfig.dotSize}px`,
    height:          `${dotConfig.dotSize}px`,
    backgroundColor: `${dotConfig.dotColor}B3`, // 末尾B3 = 約70%不透明度
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
    dotConfig.dotSize     = result.dotSize      !== undefined ? result.dotSize      : 8;
    dotConfig.dotColor    = result.dotColor     !== undefined ? result.dotColor     : '#ffffff';
    dotConfig.isDotVisible = result.isDotVisible !== undefined ? result.isDotVisible : true;
    createOrUpdateDot();
  });
}

// ストレージの変更をリアルタイムで監視してドットに反映する
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
    // ポップアップ等の外部からisDotVisibleが変更された場合もボタンに反映する
    if (changes.isDotVisible) {
      const btn = document.getElementById('cw-dot-toggle-btn');
      if (btn) {
        const DOT_ON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
          <path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7z"
                fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="12" cy="12" r="3" fill="#fff"/>
        </svg>`;
        const DOT_OFF_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
          <path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7z"
                fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="12" cy="12" r="3" fill="rgba(255,255,255,0.4)"/>
          <line x1="4" y1="4" x2="20" y2="20" stroke="rgba(255,255,255,0.4)" stroke-width="2" stroke-linecap="round"/>
        </svg>`;
        btn.innerHTML = changes.isDotVisible.newValue ? DOT_ON_SVG : DOT_OFF_SVG;
      }
    }
  }
});

// =============================================================
// 共通：MutationObserver でYouTube SPAのページ遷移に対応する
// =============================================================

/**
 * YouTubeはSPA（シングルページアプリ）のため、
 * DOM変化をMutationObserverで監視して各機能を再初期化する
 */
const pageObserver = new MutationObserver(() => {
  const currentPlayer = document.querySelector('.html5-video-player');

  if (currentPlayer) {
    // 明るさスライダーを挿入する
    insertBrightnessSlider();

    // ページ遷移後も明るさを維持する
    const slider = document.getElementById('yt-brightness-slider');
    if (slider) applyBrightness(parseInt(slider.value));

    // プレイヤーが新しくなったときにドットを再初期化する
    if (currentPlayer !== ytPlayer) {
      ytPlayer = currentPlayer;
      centerDot = null; // 古い参照をリセットする
      loadDotConfigAndInit();
    }
  } else {
    // プレイヤーが消えた場合はリセットする
    ytPlayer   = null;
    centerDot  = null;
  }
});

pageObserver.observe(document.body, { childList: true, subtree: true });

// 初期化：ページ読み込み時に各機能を起動する
insertBrightnessSlider();
const initialPlayer = document.querySelector('.html5-video-player');
if (initialPlayer) {
  ytPlayer = initialPlayer;
  loadDotConfigAndInit();
}
