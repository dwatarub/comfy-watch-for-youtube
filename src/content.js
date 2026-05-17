/**
 * ComfyWatch for YouTube - コンテンツスクリプト
 * YouTubeの動画プレイヤーに明るさ調節スライダーを追加する
 *
 * 挿入位置：左側コントロールバーの音量エリア(.ytp-volume-area)と
 *           再生時間表示(.ytp-time-display)の間
 * UIスタイル：音量コントロールと同様のホバー展開パネル型
 * アイコンクリック：明るさを100%にリセット（音量ミュート切り替えと同じ挙動）
 */
 
// デフォルトの明るさ（100% = 変化なし）
const DEFAULT_BRIGHTNESS = 100;
// ストレージのキー名
const STORAGE_KEY = 'youtubeBrightness';
 
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
 
  // パネル内に要素を追加する（RSTボタンは廃止）
  sliderPanel.appendChild(slider);
  sliderPanel.appendChild(valueLabel);
 
  // ラッパーにアイコンとパネルを追加する
  controlWrapper.appendChild(iconButton);
  controlWrapper.appendChild(sliderPanel);
 
  // 音量エリアの直後（再生時間の直前）に挿入する
  volumeArea.insertAdjacentElement('afterend', controlWrapper);
 
  // 保存済みの明るさ設定を読み込んで適用する
  loadAndApplyBrightness(slider, valueLabel);
 
  // アイコンクリック時：明るさを100%にリセットする（ミュート切り替えと同じ挙動）
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
  const videoPlayer = document.querySelector('video.html5-main-video');
  if (videoPlayer) {
    videoPlayer.style.filter = `brightness(${brightnessValue}%)`;
  }
}
 
/**
 * ストレージから明るさ設定を読み込んで適用する
 * @param {HTMLInputElement} slider - スライダー要素
 * @param {HTMLSpanElement} valueLabel - 値表示ラベル
 */
function loadAndApplyBrightness(slider, valueLabel) {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    const savedValue = result[STORAGE_KEY] ?? DEFAULT_BRIGHTNESS;
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
  chrome.storage.local.set({ [STORAGE_KEY]: brightnessValue });
}
 
/**
 * YouTubeはSPA（シングルページアプリ）のため、
 * ページ遷移をMutationObserverで監視してスライダーを再挿入する
 */
function observePlayerChanges() {
  const observer = new MutationObserver(() => {
    // プレイヤーが存在する場合にスライダーを挿入する
    const player = document.querySelector('.html5-video-player');
    if (player) {
      insertBrightnessSlider();
 
      // ページ遷移後も明るさを維持する
      const slider = document.getElementById('yt-brightness-slider');
      if (slider) {
        applyBrightness(parseInt(slider.value));
      }
    }
  });
 
  // body全体の変更を監視する（YouTube SPAのページ遷移に対応）
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}
 
// 初期化：ページ読み込み時にスライダーを挿入して監視を開始する
insertBrightnessSlider();
observePlayerChanges();
