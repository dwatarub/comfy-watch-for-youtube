/**
 * ComfyWatch for YouTube - ポップアップスクリプト
 * センタードットの表示/非表示トグルを管理する
 */

/**
 * data-i18n属性を持つ要素をロケール文字列で置き換える
 */
function localizeHtmlPage() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = chrome.i18n.getMessage(el.getAttribute('data-i18n'));
  });
}

const dotVisibleToggle = document.getElementById('dotVisibleToggle');

/**
 * ストレージからポップアップの状態とテーマを読み込んで復元する
 */
function restorePopupState() {
  chrome.storage.sync.get({ isDotVisible: true, theme: 'light' }, (items) => {
    dotVisibleToggle.checked = items.isDotVisible;
    // テーマをポップアップのbodyに適用する
    document.body.setAttribute('data-theme', items.theme);
  });
}

/**
 * トグルの状態をストレージに保存する
 */
function savePopupState() {
  chrome.storage.sync.set({ isDotVisible: dotVisibleToggle.checked });
}

document.addEventListener('DOMContentLoaded', () => {
  localizeHtmlPage();
  restorePopupState();
});

dotVisibleToggle.addEventListener('click', savePopupState);
