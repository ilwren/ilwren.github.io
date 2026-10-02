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

- 参考图使用薰衣草紫、明紫、珍珠白和少量粉色点缀，替换主题默认的高饱和红色。
- 同时调整了浅色、深色模式、代码高亮、链接、卡片、导航栏和阴影颜色。
- 移除了菜单、页脚和返回顶部按钮中的太极符号，改用紫色星芒图标；页脚不再显示主题原作者标识。
- 已启用本地星芒加载图标、首页分类卡片、返回顶部和页面动画；搜索、评论、赞助等需要第三方账号的功能仍保持关闭。
- 暂时关闭横幅图片和文章默认封面；页首使用 CSS 渐变作为占位背景。
- `static/avatar/avatar.png` 使用 main 分支提供的角色头像；配色参考图只用于取色，没有作为背景图上传。
- `static/images/cover-placeholder.svg` 是无角色的本地文章封面占位素材。
- 已关闭不蒜子、百度统计、Google Analytics、Clarity 等统计服务；页脚保留的字数和阅读时间是 Hugo 本地构建数据，不会请求统计服务。
- 主题源码没有直接修改，颜色通过 `internal_theme` 和 `injector` 覆盖，后续更新 submodule 更容易合并；第三方依赖镜像在站点数据中改为 jsDelivr，避免运行时请求区域性 `.cn` 镜像。

颜色入口主要在 `config/_default/params.yml` 的 `internal_theme` 和 `injector.head_end`。如果需要换成最终参考图，只要把 `banner` 改为图片路径，并按需把 `cover` 改为图片路径即可。

## 自定义组件

站点提供了几个适合技术文章的 shortcode：

```markdown
{{< techStack items=".NET 8,C#,ASP.NET Core,EF Core" >}}

{{< projectCard
  title="示例项目"
  description="项目说明"
  tech=".NET 8,Docker,GitHub Actions"
  link="https://github.com/your-name/your-repo"
>}}

{{< aiTrace tool="Claude Code" model="按文章记录" status="verified" >}}
记录提示词、人工修改、测试和安全检查。
{{< /aiTrace >}}
```

- `techStack`：技术栈标签。
- `projectCard`：项目展示卡片。
- `aiTrace`：记录 Vibe Coding 使用的工具、模型和验证状态。

创建新文章时，`archetypes/default.md` 会自动提供分类、标签、系列、.NET 版本、代码仓库和 AI 协作字段。

## 部署到 GitHub Pages

仓库已包含 `.github/workflows/hugo.yml`。推送到 `main` 后会自动构建并发布；当前还临时监听 Arena 工作分支，用于上线前预览。注意：同一个 GitHub Pages 站点没有独立的分支预览地址，推送 Arena 分支会暂时替换线上页面。

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
