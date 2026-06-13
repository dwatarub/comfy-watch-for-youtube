/**
 * ComfyWatch for YouTube - ポップアップスクリプト
 * オプションページを開くボタンのみを管理する
 * （ドットのON/OFFはYouTubeプレイヤー上のトグルボタンで操作する）
 */
document.getElementById('openOptions').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
