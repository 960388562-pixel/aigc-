# GradientASCII source

首页参数位于 `site-gradientascii-entry.jsx`。`GradientASCII.jsx` 与 `GradientASCII.css` 来自 React Bits。

修改参数后，在包含 React、React DOM 和 esbuild 的构建环境中执行：

```powershell
esbuild site-gradientascii-entry.jsx `
  --bundle --minify --format=iife --target=es2020 --jsx=automatic `
  --define:process.env.NODE_ENV="production" `
  --outfile=../../js/gradient-ascii.iife.js
```

首页只加载 `assets/js/gradient-ascii.iife.js`；第一页 `portfolio.html` 的 Galaxy 背景独立加载，不会被此文件影响。
