# 赵健翔 · AI 视觉设计师作品集

一个无构建依赖的静态网站，包含「封面视觉页」和「作品集主页」两级页面。直接双击 `index.html` 即可预览，也可以把整个 `site` 文件夹上传到任意静态托管平台上线。

## 本地打开

### 方式一：直接打开

双击 `index.html`。页面使用纯 HTML / CSS / JavaScript，本地图片和 PDF 都通过相对路径加载，不依赖网络。

### 方式二：本地服务器（推荐用于调试）

在 `site` 文件夹内执行：

```bash
python -m http.server 4173
```

然后打开 `http://127.0.0.1:4173/`。

## 页面结构

```text
index.html                 封面 / 视觉入口
portfolio.html             作品集主页
assets/
  css/base.css             设计变量、基础排版、动效、光标
  css/entry.css            封面页样式
  css/site.css             作品集页面样式
  js/field.js              WebGL 等高线视觉背景
  js/entry.js              封面页进入动效
  js/site.js               导航、滚动、项目弹层、复制等交互
  img/portrait-cutout.png  透明背景人物图
  img/cover-lion.jpg       项目 01 主视觉
  img/cover-ai.jpg         项目 02 主视觉
  img/cover-light.jpg      项目 03 主视觉
  files/zhao-jianxiang-resume.pdf  简历下载
```

## 修改内容

| 想改什么 | 改哪里 |
| --- | --- |
| 封面姓名、标语、入口按钮 | `index.html` |
| 首屏标题、介绍、按钮 | `portfolio.html` 的 `.hero` |
| 个人经历、联系方式、数据 | `portfolio.html` 的 `#about` |
| 项目卡片标题、描述、标签 | `portfolio.html` 的 `#work` |
| 项目弹层里的详细文案 | `assets/js/site.js` 的 `projects` 对象 |
| 能力卡片、工作方法 | `portfolio.html` 的 `#strengths` |
| 页尾联系区 | `portfolio.html` 的 `#contact` |
| 颜色、字体、间距、断点 | `assets/css/base.css` 与 `assets/css/site.css` |
| 简历文件 | 替换 `assets/files/zhao-jianxiang-resume.pdf` |

项目卡片正文和弹层文案目前是两处：卡片用于 SEO 和不依赖 JS 的阅读，弹层用于沉浸式查看。修改项目时两处都要同步。

## 替换图片

### 人物图

当前 `portrait-cutout.png` 由你提供的证件照去除背景后生成。建议后续替换为：

- 透明背景 PNG，约 3:4 竖构图，长边 2000px 以上；
- 人物视线与头部位置尽量居中，肩膀保留完整；
- 深色服装或局部高光更容易融入暗色背景；
- 若没有抠图版本，也可以直接替换 `portrait.jpg` 并调整 CSS 里的 `filter` 和遮罩。

### 项目主视觉

三张封面目前是为首版制作的概念海报，尺寸 1600×1000。替换时保持同样比例即可：

- `cover-lion.jpg`：醒狮项目；
- `cover-ai.jpg`：试图驯服 AI 项目；
- `cover-light.jpg`：光的样本。

建议使用真实成片抽帧、分镜图或项目截图。封面内已有排版文字；如果换成真实剧照，卡片的文字层仍然保留，不会影响信息结构。

## 上线

这是纯静态网站，不需要构建命令。

- **Netlify**：把 `site` 文件夹直接拖到 Netlify Drop；
- **Vercel**：新建项目，Framework 选择 Other，Root Directory 指向 `site`，无需 Build Command；
- **GitHub Pages**：把 `site` 内文件推到仓库根目录，开启 Pages；
- **任意服务器**：把 `site` 内容放到站点根目录，确保 `index.html` 可访问。

上线后建议补充：

1. 把 `og:image` 改成可公开访问的绝对地址；
2. 绑定域名并开启 HTTPS；
3. 用真实项目图替换概念封面；
4. 如需统计访问，再接入 Plausible / Umami 等轻量统计。

## 技术与兼容

- 无外部字体、无 CDN，所有资源均通过本地相对路径加载；
- 首页 `index.html` 使用本地打包的 React Bits `GradientASCII` 地平线 ASCII 背景；
- 首页已移除 Hyperspeed 启动页，打开后直接显示首页；ASCII 背景和文字动画保留；
- 第一页 `portfolio.html` 使用本地打包的 React Bits `Galaxy` WebGL 星空；
- `about.html` 的“联系我”按钮会跳转到使用 React Bits `CardSwap` 构建的电话、邮箱、微信和 QQ 联系卡片；
- 微信与 QQ 卡片包含对应的独立二维码图片；
- `about.html` 基础信息页使用全视口 `Galaxy` 星空背景，原来的渐变背景已移除；
- `portfolio.html` 的基础信息交互卡片使用 Specular 边缘高光，卡片尺寸与内容保持不变；
- 两个背景画布均固定铺满视口，支持鼠标交互和移动端响应式缩放；
- WebGL 背景不可用时保留深色背景以确保文字可读；
- 支持 `prefers-reduced-motion`；
- 键盘可操作项目弹层、移动端菜单和联系方式复制；
- 已在 Edge / Chromium 桌面与 390px、375px 移动视口下完成回归检查。

## 首版说明

- 项目内容来自你提供的简历，文案在此基础上做了网页化重组；
- 第三项「光的样本」是标注清楚的个人视觉研究，不属于商业项目；
- 项目主视觉是概念海报，不是实际成片截图；
- 首版未加入视频播放器、后台表单和多语言切换，适合先预览与继续迭代。
