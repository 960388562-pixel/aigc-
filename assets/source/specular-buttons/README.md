# Specular buttons source

`SpecularButton.jsx` 与 `SpecularButton.css` 来自 React Bits。`site-specular-entry.jsx` 负责挂载页面中的 Specular 按钮及基础信息卡片的纯装饰边缘层。

重建命令：

```powershell
esbuild site-specular-entry.jsx `
  --bundle --minify --format=iife --target=es2020 --jsx=automatic `
  --define:process.env.NODE_ENV="production" `
  --outfile=../../js/specular-buttons.iife.js
```

生成后的 CSS 保存到 `assets/css/specular-buttons.css`。基础信息卡片使用 `data-sb-as="div"`，因此只显示边缘特效，不会产生嵌套按钮或额外点击行为。
