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

## 本地离线预览与部署

Hugo 构建本身不需要 Node.js 或在线服务，但第一次准备仓库时需要下载 Hugo Extended 和主题 submodule。已经准备过一次后，可以完全在本地构建：

```bash
# 新克隆仓库时一次性获取主题
git clone --recursive https://github.com/ilwren/ilwren.github.io.git
cd ilwren.github.io

# 如果是普通 clone，改用这条命令初始化主题
git submodule update --init --recursive

hugo version                 # 确认包含 extended
hugo server -D --bind 127.0.0.1 --port 1313
```

如果需要生成可交给 Nginx、Apache 或其它静态服务器的文件：

```bash
hugo --gc --minify --baseURL http://127.0.0.1:1313/ --destination public
python3 -m http.server 1313 --bind 127.0.0.1 --directory public
```

这个站点没有必须在本地运行的后端。完全离线时需要注意两个可选功能：

- Utterances 评论依赖 `utteranc.es` 和 GitHub，断网时不会显示评论。临时离线预览可以把 `config/_default/params.yml` 中的 `utterances.enable` 改为 `false`，预览结束再恢复。
- GitHub 账号活动组件只读取站点自己的 `/data/github-account-activity.json`。如果要保留离线图表，可以在有网络时把线上快照下载到本地：

  ```bash
  mkdir -p static/data
  curl -fsSL https://ilwren.github.io/data/github-account-activity.json \\
    -o static/data/github-account-activity.json
  ```

  如果本地没有这个文件，页面会显示“暂无数据”，不会因为无法访问 GitHub 而阻止 Hugo 构建。第三方贡献 API 只在 GitHub Actions 构建时使用，访客浏览器和本地离线预览都不会直接调用它。

`hugo server` 本身不需要单独的 `--offline` 参数；只要 Hugo Extended、主题 submodule 和要使用的本地资源已经在磁盘上，构建就是离线的。第一次没有主题文件时，离线环境无法初始化 submodule，需要提前把完整仓库和 `themes/hugo-theme-reimu` 一起复制过来。

## 本地图片、封面、背景与 Logo

推荐所有离线可用的图片都放在 `static/` 下。Hugo 会把它们原样复制到站点根目录：

```text
static/
├── avatar/avatar.png                    # 当前角色头像，只作为头像使用
├── images/banner.webp                   # 全局头图
├── images/site-background.webp          # 可选的网站背景图
├── images/posts/order-api-cover.webp    # 文章封面
├── images/posts/order-api-diagram.webp  # 文章正文插图
├── images/logo.svg                      # 可选导航图标
└── favicon.ico                          # 浏览器标签页图标
```

### 头像

当前配置已经使用确认过的头像：

```yaml
# config/_default/params.yml
avatar: "avatar.png"
```

文件必须位于 `static/avatar/avatar.png`。这个文件不要拿来当背景图、文章封面或 Logo。

### 全局头图

当前全局头图是关闭的：

```yaml
banner: false
```

准备好本地图片后，将它放到 `static/images/banner.webp`，再改成：

```yaml
banner: "images/banner.webp"
```

当前站点为了保持无背景图的角色主题，使用的是 CSS 渐变占位；不改这个配置就不会启用全局头图。

### 单篇文章的封面和头图

可以在文章 Front Matter 中分别指定文章页头图和列表卡片封面：

```yaml
---
title: "用 .NET 8 构建一个可测试的订单 Minimal API"
banner: "/images/posts/order-api-banner.webp"
cover: "/images/posts/order-api-cover.webp"
---
```

对应文件放在 `static/images/posts/`。如果只需要文章页头图，只写 `banner`；如果不希望使用图片，继续保持 `cover: false` 或不填写即可。

### 正文插图

Markdown 直接引用 `static/` 下的路径：

```markdown
![订单 API 分层示意图](/images/posts/order-api-diagram.webp)
```

在线图片 URL 也能显示，但不适合离线部署。建议使用 WebP、AVIF 或经过压缩的 PNG，并为每张图片写有意义的 alt 文本。

### Favicon 和 Logo

浏览器标签页图标可以直接覆盖主题默认资源：把 `favicon.ico` 放在 `static/` 根目录。若要使用 SVG，需要同时确认当前主题模板引用了对应文件。这个主题没有单独的全局 `logo` 参数：

- 浏览器上的站点图标使用 `static/favicon.ico`；
- 导航项目可以使用本地图片作为图标，例如把某一项的 `icon` 设置为 `/images/logo.svg`；
- 如果要做页首品牌 Logo，需要在站点层覆盖主题 partial 或使用 `injector` 添加 HTML，不建议修改 `themes/hugo-theme-reimu`。

### 背景图片

当前紫色渐变在 `config/_default/params.yml` 的 `injector.head_end` 中定义。如果以后需要加入本地背景图，可以在站点层 CSS 中叠加：

```yaml
injector:
  head_end: |
    <style>
      #header {
        background:
          linear-gradient(rgba(245, 240, 252, 0.78), rgba(245, 240, 252, 0.88)),
          url("/images/site-background.webp") center / cover no-repeat;
      }
    </style>
```

背景图只会改变页首或页面视觉层，不要把 `static/avatar/avatar.png` 复用为背景素材。当前仓库仍然保持无背景图方案。

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
- `githubActivity`：显示 GitHub 账号 `ilwren` 近 52 周的账号贡献活动（不是单个仓库统计）。

创建新文章时，`archetypes/default.md` 会自动提供分类、标签、系列、.NET 版本、代码仓库和 AI 协作字段。

## GitHub 评论（Utterances）

文章评论使用 [Utterances](https://utteranc.es/)，评论会保存为 GitHub Issues，不需要 OAuth 客户端密钥，也不会接入访问统计服务。当前关联仓库是 `ilwren/ilwren.github.io`，并按文章路径（`pathname`）关联 Issue，主题会自动跟随博客的浅色或深色模式。

首次启用前，请在 GitHub 仓库中确认：

1. 仓库是公开仓库，并已开启 **Issues**。
2. 安装 [Utterances GitHub App](https://github.com/apps/utterances)。
3. 授权 Utterances 为文章创建或关联 Issues。

评论功能由主题已有的站点层配置加载，配置入口是 `config/_default/params.yml` 的 `comment` 和 `utterances` 字段。若改用 GitHub Discussions，可以切换到 Giscus，但需要从 `giscus.app` 获取 `repoId` 和 `categoryId`。

## GitHub 账号贡献统计

关于页的 GitHub 活动组件现在展示账号 `ilwren` 最近一年的：

- 账号贡献总数；
- 有贡献的周数；
- 52 周贡献活动图；
- GitHub 个人主页链接。

这里的“贡献”使用 GitHub 账号贡献日历的口径，包含公开仓库中的提交，以及 GitHub 计入贡献日历的 Pull Request、Issue、Review 等活动；它不是单个仓库的 `stats/commit_activity` 数据。如果只需要严格意义上的 commit 数量，需要另行使用 GitHub GraphQL 的 `totalCommitContributions`，那通常需要在 Actions 中配置额外的个人访问令牌。

每次 GitHub Actions 构建都会从第三方 [GitHub Contributions API](https://github-contributions-api.jogruber.de/) 获取账号贡献数据，生成构建产物中的 `data/github-account-activity.json`，再由本地 `static/js/github-activity.js` 绘图。第三方接口结果会缓存约一小时；工作流还会回退到 GitHub 的公开个人贡献日历。访客浏览器只读取站点自己的静态 JSON，不会直接请求 GitHub 或第三方接口。

当前数据仍然是“构建时生成的静态快照”，这是 Hugo 静态站点的预期工作方式，不是把数据写死在页面中。部署工作流已增加每日定时构建，合并到 `main` 后会自动更新账号数据；也可以手动运行 workflow 立即刷新。没有引入 Google Analytics、Clarity、不蒜子或其它访问统计服务。

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

> 当前 Arena 工作分支是 `arena/01a0fb3c-ilwren-github-io`。在本地开发分支上完成修改后，合并到 `main` 才会触发上面的部署工作流。正式合并前保留该分支的 Pages 预览配置；合并并确认 `main` 部署成功后，删除 `hugo.yml` 中的临时分支触发器和 `github-pages-preview` 环境配置，再提交到 `main`，最后删除远端临时分支。
