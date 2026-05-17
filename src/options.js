/**
 * ComfyWatch for YouTube - オプションページスクリプト
 * センタードットのサイズ・色・テーマを管理する
 */

/**
 * data-i18n属性を持つ要素をロケール文字列で置き換える
 */
function localizeHtmlPage() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = chrome.i18n.getMessage(el.getAttribute('data-i18n'));
  });
}

const dotSizeInput    = document.getElementById('dotSize');
const dotColorInput   = document.getElementById('dotColor');
const sizeValueSpan   = document.getElementById('sizeValue');
const previewDot      = document.getElementById('previewDot');
const themeToggle     = document.getElementById('themeToggle');

// ===== テーマ管理 =====

/**
 * テーマをbodyに適用してトグルの状態を更新する
 * @param {string} theme - 'light' または 'dark'
 */
function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  themeToggle.checked = theme === 'dark';
}

/**
 * テーマを切り替えてストレージに保存する
 */
function toggleTheme() {
  const newTheme = themeToggle.checked ? 'dark' : 'light';
  applyTheme(newTheme);
  chrome.storage.sync.set({ theme: newTheme });
}

// ===== ドット設定管理 =====

/**
 * プレビュードットにサイズと色を反映する
 */
function updatePreview() {
  const size  = dotSizeInput.value;
  const color = dotColorInput.value;

  sizeValueSpan.textContent    = `${size}px`;
  previewDot.style.width       = `${size}px`;
  previewDot.style.height      = `${size}px`;
  previewDot.style.backgroundColor = color;
  previewDot.style.display     = 'block';
}

/**
 * ドット設定をストレージに保存する
 */
function saveOptions() {
  chrome.storage.sync.set({
    dotSize:  parseInt(dotSizeInput.value),
    dotColor: dotColorInput.value
  });
}

/**
 * ストレージから設定を読み込んでUIに反映する
 */
function restoreOptions() {
  chrome.storage.sync.get({ dotSize: 8, dotColor: '#ffffff', theme: 'light' }, (items) => {
    dotSizeInput.value  = items.dotSize;
    dotColorInput.value = items.dotColor;
    applyTheme(items.theme);
    updatePreview();
  });
}

// ===== イベントリスナー =====

document.addEventListener('DOMContentLoaded', () => {
  localizeHtmlPage();
  restoreOptions();
});

themeToggle.addEventListener('change', toggleTheme);

dotSizeInput.addEventListener('input', () => {
  updatePreview();
  saveOptions();
});

dotColorInput.addEventListener('input', () => {
  updatePreview();
  saveOptions();
});
