# Ilwren 的 Hugo 博客

本站使用 [hugo-theme-reimu](https://github.com/D-Sketon/hugo-theme-reimu)，主题以 Git submodule 的方式固定在 `themes/hugo-theme-reimu`。

## 本地预览

需要安装 **Hugo Extended 0.158.0 或更高版本**（主题使用 SCSS）：

```bash
git clone --recursive https://github.com/ilwren/ilwren.github.io.git
cd ilwren.github.io
hugo server -D
```

打开 <http://localhost:1313/> 即可预览。修改 `config/_default/params.yml` 后，Hugo 会自动刷新页面。

## 当前视觉定制

- 以低饱和的雾青、暖沙色和纸张白替换主题默认的高饱和红色。
- 同时调整了浅色、深色模式、代码高亮、链接、卡片、导航栏和阴影颜色。
- 暂时关闭横幅图片和文章默认封面；页首使用 CSS 渐变作为占位背景。
- `static/images/cover-placeholder.svg` 只是本地占位素材，不是参考图；参考图片没有复制或上传到仓库。
- 主题源码没有直接修改，颜色通过 `internal_theme` 和 `injector` 覆盖，后续更新 submodule 更容易合并。

颜色入口主要在 `config/_default/params.yml` 的 `internal_theme` 和 `injector.head_end`。如果需要换成最终参考图，只要把 `banner` 改为图片路径，并按需把 `cover` 改为图片路径即可。

## 部署到 GitHub Pages

仓库已包含 `.github/workflows/hugo.yml`。推送到 `main` 后会自动构建并发布：

1. 在 GitHub 仓库打开 **Settings → Pages**。
2. 在 **Build and deployment → Source** 选择 **GitHub Actions**。
3. 确认仓库名为 `ilwren.github.io`，且 `hugo.toml` 中的 `baseURL` 是 `https://ilwren.github.io/`。
4. 提交并推送：

   ```bash
   git add .
   git commit -m "customize Reimu theme"
   git push origin main
   ```

5. 在 **Actions** 页面等待 `Deploy Hugo site to GitHub Pages` 完成；首次发布后访问 <https://ilwren.github.io/>。

工作流会递归检出主题 submodule，使用 Hugo Extended，生成 `public/`，再通过 Pages artifact 发布。日后只需将文章放入 `content/post/` 并推送即可。

> 当前 Arena 工作分支是 `arena/01a0fb3c-ilwren-github-io`。在本地开发分支上完成修改后，合并到 `main` 才会触发上面的部署工作流。
