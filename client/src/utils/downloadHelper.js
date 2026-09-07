/**
 * 健壮可靠的图片与 Canvas 下载工具函数
 * 兼容 Chrome, Safari (WebKit), Firefox, Edge 以及移动端浏览器
 */

export function downloadCanvas(canvas, filename = 'image.png') {
  if (!canvas) return;

  try {
    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (!blob) {
          downloadDataUrl(canvas.toDataURL('image/png'), filename);
          return;
        }
        const url = URL.createObjectURL(blob);
        triggerDownload(url, filename, () => URL.revokeObjectURL(url));
      }, 'image/png');
    } else {
      downloadDataUrl(canvas.toDataURL('image/png'), filename);
    }
  } catch (err) {
    console.error('downloadCanvas error, fallback to dataURL:', err);
    downloadDataUrl(canvas.toDataURL('image/png'), filename);
  }
}

export function downloadDataUrl(dataUrl, filename = 'image.png') {
  triggerDownload(dataUrl, filename);
}

export function triggerDownload(url, filename, cleanup) {
  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = url;
  link.download = filename;

  // 关键：必须加入 DOM 树以触发 Safari 与 Chrome 的标准下载流程
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    if (link.parentNode) {
      document.body.removeChild(link);
    }
    if (cleanup) cleanup();
  }, 600);
}

/**
 * 提取某个容器内的 Canvas 并导出为带有白色安全留白边框的高清纯二维码图片
 */
export function downloadQrCodeFromContainer(containerOrId, filename = '考试二维码.png', title = '') {
  const container = typeof containerOrId === 'string' ? document.getElementById(containerOrId) : containerOrId;
  if (!container) return false;

  const canvas = container.querySelector('canvas');
  if (!canvas) return false;

  // 创建带 24px 白色保护边框和顶部考试名称的清晰二维码图片，方便打印张贴与手机扫描
  const padding = 24;
  const titleHeight = title ? 44 : 0;
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = canvas.width + padding * 2;
  exportCanvas.height = canvas.height + padding * 2 + titleHeight;

  const ctx = exportCanvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

  // 如果有标题，绘制顶部居中考试名称
  if (title) {
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title.length > 18 ? title.slice(0, 18) + '...' : title, exportCanvas.width / 2, padding + 12);
  }

  // 绘制二维码主画面
  ctx.drawImage(canvas, padding, padding + titleHeight);

  downloadCanvas(exportCanvas, filename);
  return true;
}

/**
 * 获取考试扫码标准安全链接（自动剥离非标8080端口，优先使用标准80端口或自定义域名）
 */
export function getExamScanUrl(codeKey, customDomain = '') {
  if (!codeKey) return '';
  if (customDomain && customDomain.trim()) {
    const base = customDomain.trim().replace(/\/+$/, '');
    return `${base}/exam/${codeKey}`;
  }
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  // 关键优化：自动去除 8080 端口，转为标准 80/443 端口，防止手机 5G 运营商屏蔽非标端口
  const port = (window.location.port === '8080' || !window.location.port || window.location.port === '80' || window.location.port === '443')
    ? ''
    : `:${window.location.port}`;
  return `${protocol}//${hostname}${port}/exam/${codeKey}`;
}
