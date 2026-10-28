# Contact cards source

页面实现位于 `site-contact-entry.jsx`，联系卡片样式位于 `contact-card-theme.css`，轮播组件来自 React Bits `CardSwap`。

修改后使用 esbuild 重新生成：

```powershell
esbuild site-contact-entry.jsx `
  --bundle --minify --format=iife --target=es2020 --jsx=automatic `
  --define:process.env.NODE_ENV="production" `
  --outfile=../../js/contact-cards.iife.js
```

生成后的 CSS 需要同步保存到 `assets/css/contact-cards.css`。二维码资源位于 `assets/img/contact-wechat-qr.png` 和 `assets/img/contact-qq-qr.png`。
